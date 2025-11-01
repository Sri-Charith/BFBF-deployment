import asyncHandler from '../middleware/asyncHandler.js';
import { ok } from '../utils/response.js';
import { compare } from '../services/compareService.js';

export const compareController = asyncHandler(async (req, res) => {
  const { districts, years, year, state } = req.query;
  
  // Support both 'years' (comma-separated) and 'year' (single) for backward compatibility
  let yearList = [];
  if (years) {
    yearList = String(years).split(',').map(s => s.trim()).filter(Boolean);
  } else if (year) {
    yearList = [year];
  }
  
  const districtList = districts ? String(districts).split(',').map(s => s.trim()).filter(Boolean) : [];
  const filters = { districts: districtList, years: yearList, state };
  const result = await compare(filters);
  return ok(res, result);
});


