import pool from '../config/db.js';
import { whereAndParams } from './sqlBuilder.js';
import { AVG_METRICS } from '../utils/constants.js';

// Build aggregation expressions: AVG for percentage/average metrics, SUM for totals
const buildAgg = (col) => {
  if (AVG_METRICS.has(col)) {
    return `COALESCE(AVG("${col}"), 0) AS "${col}"`;
  }
  return `COALESCE(SUM("${col}"), 0) AS "${col}"`;
};

export const compare = async ({ districts = [], years = [], state } = {}) => {
  // Build WHERE clause for year(s) and state
  const yearFilters = [];
  const params = [];
  let paramIndex = 1;

  if (state) {
    params.push(state);
    yearFilters.push(`"state_name" = $${paramIndex}`);
    paramIndex++;
  }

  // Handle years - can be single year or array of years
  const yearList = Array.isArray(years) ? years : (years ? [years] : []);
  if (yearList.length > 0) {
    const yearPlaceholders = yearList.map((_, i) => `$${paramIndex + i}`).join(',');
    params.push(...yearList);
    yearFilters.push(`"fin_year" IN (${yearPlaceholders})`);
    paramIndex += yearList.length;
  }

  const whereClause = yearFilters.length > 0 ? `WHERE ${yearFilters.join(' AND ')}` : '';
  
  // Handle districts
  let inClause = '';
  let districtParams = [];
  if (districts.length > 0) {
    districtParams = districts;
    const ph = districtParams.map((_, i) => `$${paramIndex + i}`).join(',');
    inClause = yearFilters.length > 0 ? ` AND "district_name" IN (${ph})` : `WHERE "district_name" IN (${ph})`;
    params.push(...districtParams);
  }

  // Only fetch the 5 key metrics + metadata for performance
  const q = `
    SELECT 
      MIN("district_name") AS "district_name",
      MIN("state_name") AS "state_name",
      MIN("fin_year") AS "fin_year",
      ${buildAgg('Total_Exp')},
      ${buildAgg('Average_Wage_rate_per_day_per_person')},
      ${buildAgg('Number_of_Completed_Works')},
      ${buildAgg('Total_Households_Worked')},
      ${buildAgg('Average_days_of_employment_provided_per_Household')}
    FROM state_data
    ${whereClause}${inClause}
    GROUP BY "district_name", "state_name", "fin_year"
    ORDER BY "district_name", "fin_year"
  `;

  const { rows } = await pool.query(q, params);

  // Convert BigInt and Decimal values to numbers for JSON serialization
  const processedRows = rows.map(row => {
    const processed = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        processed[key] = null;
      } else if (typeof value === 'bigint') {
        processed[key] = Number(value);
      } else if (typeof value === 'object' && value.constructor && value.constructor.name === 'Decimal') {
        processed[key] = Number(value);
      } else if (typeof value === 'object' && value.toString) {
        try {
          processed[key] = Number(value.toString());
        } catch (e) {
          processed[key] = value;
        }
      } else {
        processed[key] = value;
      }
    }
    return processed;
  });

  return { filters: { districts, years: yearList, state }, data: processedRows };
};


