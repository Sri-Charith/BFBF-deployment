import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Loader from '../components/Loader.jsx';
import { getDistricts, getYears, getCompare } from '../api/metricsAPI';
import { formatHumanReadable, explainDigitPlaces } from '../utils/formatNumber.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const DEFAULT_DISTRICT = 'Siddipet';
const DEFAULT_YEAR = '2025-2026';
const MONTHS = ['All', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// Optimized: Only 2 most important metrics for faster performance
const COMPARISON_METRICS = [
  { key: 'Total_Exp', label: 'Total Expenditure', color: '#8884d8', shortLabel: 'Total Exp' },
  { key: 'Average_Wage_rate_per_day_per_person', label: 'Average Wage Rate', color: '#82ca9d', shortLabel: 'Avg Wage Rate' }
];

// Cache for API responses
const dataCache = new Map();

const getCacheKey = (districts, years) => {
  return `${JSON.stringify(districts.sort())}_${JSON.stringify(years.sort())}`;
};

export default function Compare() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState('districts'); // 'districts' or 'time'
  const [districts, setDistricts] = useState([]);
  const [years, setYears] = useState([]);
  
  // For district comparison mode
  const [district1, setDistrict1] = useState(DEFAULT_DISTRICT);
  const [district2, setDistrict2] = useState(DEFAULT_DISTRICT);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [month, setMonth] = useState('All');
  
  // For time comparison mode
  const [timeDistrict, setTimeDistrict] = useState(DEFAULT_DISTRICT);
  const [year1, setYear1] = useState(DEFAULT_YEAR);
  const [year2, setYear2] = useState(DEFAULT_YEAR);
  const [month1, setMonth1] = useState('All');
  const [month2, setMonth2] = useState('All');

  const [comparisonData, setComparisonData] = useState({ chartData: [], metrics: {} });
  const [error, setError] = useState(null);

  // Load districts and years on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [d, y] = await Promise.all([
          getDistricts().catch(() => []),
          getYears().catch(() => [])
        ]);
        const districtsList = Array.isArray(d) ? d : (d?.data || []);
        const yearsList = Array.isArray(y) ? y : (y?.data || []);
        setDistricts(districtsList);
        setYears(yearsList);
      } catch (err) {
        console.error('Failed to load options:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  // Load comparison data
  const loadComparison = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let districtsToCompare = [];
      let yearsToCompare = [];
      
      if (comparisonMode === 'districts') {
        // Compare two districts in the same year
        if (district1 === district2) {
          setError('Please select two different districts for comparison');
          setLoading(false);
          return;
        }
        districtsToCompare = [district1, district2];
        yearsToCompare = [year];
      } else {
        // Compare same district across different years
        if (year1 === year2) {
          setError('Please select two different years for comparison');
          setLoading(false);
          return;
        }
        districtsToCompare = [timeDistrict];
        yearsToCompare = [year1, year2];
      }

      const cacheKey = getCacheKey(districtsToCompare, yearsToCompare);
      const cachedData = dataCache.get(cacheKey);
      if (cachedData && cachedData.chartData?.length > 0) {
        setComparisonData(cachedData);
        setLoading(false);
        return;
      }

      const result = await getCompare({
        districts: districtsToCompare.join(','),
        years: yearsToCompare.join(',')
      });

      // Handle various response structures
      let data = [];
      if (Array.isArray(result)) {
        data = result;
      } else if (Array.isArray(result?.data)) {
        data = result.data;
      } else if (result?.data?.data && Array.isArray(result.data.data)) {
        data = result.data.data;
      }
      
      // Optimized: Process data for 2 metrics + prepare grouped chart data
      const chartData = [];
      const metricsData = {};
      
      if (comparisonMode === 'districts') {
        // One entry per district for grouped chart
        districtsToCompare.forEach(district => {
          const row = data.find(d => d.district_name === district && d.fin_year === yearsToCompare[0]);
          const entry = {
            name: String(district).replaceAll('_', ' '),
            district: district
          };
          
          COMPARISON_METRICS.forEach(metric => {
            entry[metric.key] = row ? Number(row[metric.key] || 0) : 0;
          });
          
          chartData.push(entry);
        });
        
        // Build metrics data for cards
        COMPARISON_METRICS.forEach(metric => {
          const comparisonItems = chartData.map(item => ({
            name: item.name,
            value: item[metric.key],
            year: yearsToCompare[0],
            district: item.district
          }));
          metricsData[metric.key] = {
            ...metric,
            comparison: comparisonItems
          };
        });
      } else {
        // One entry per year for grouped chart
        yearsToCompare.forEach(year => {
          const row = data.find(d => d.district_name === districtsToCompare[0] && d.fin_year === year);
          const entry = {
            name: String(year),
            year: year
          };
          
          COMPARISON_METRICS.forEach(metric => {
            entry[metric.key] = row ? Number(row[metric.key] || 0) : 0;
          });
          
          chartData.push(entry);
        });
        
        // Build metrics data for cards
        COMPARISON_METRICS.forEach(metric => {
          const comparisonItems = chartData.map(item => ({
            name: item.name,
            value: item[metric.key],
            year: item.year,
            district: districtsToCompare[0]
          }));
          metricsData[metric.key] = {
            ...metric,
            comparison: comparisonItems
          };
        });
      }

      const processedData = {
        chartData,
        metrics: metricsData
      };

      dataCache.set(cacheKey, processedData);
      setComparisonData(processedData);
    } catch (err) {
      console.error('Failed to load comparison data:', err);
      setError('Failed to load comparison data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = useCallback((event, newMode) => {
    if (newMode !== null) {
      setComparisonMode(newMode);
      setComparisonData({ chartData: [], metrics: {} });
      setError(null);
    }
  }, []);

  const handleApply = useCallback(() => {
    loadComparison();
  }, [comparisonMode, district1, district2, year, timeDistrict, year1, year2]);

  if (loading && (!comparisonData.chartData || comparisonData.chartData.length === 0)) {
    return <Loader />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/')}
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
          aria-label="Back to Dashboard"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            COMPARE PERFORMANCE DATA
          </Typography>
          <Typography variant="body2" color="text.secondary">Compare districts or time periods</Typography>
        </Box>
      </Box>

      {/* Comparison Mode Toggle */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={comparisonMode}
          exclusive
          onChange={handleModeChange}
          aria-label="comparison mode"
          size="small"
        >
          <ToggleButton value="districts" aria-label="compare districts">
            <Typography variant="body2">Compare Districts</Typography>
          </ToggleButton>
          <ToggleButton value="time" aria-label="compare time periods">
            <Typography variant="body2">Compare Time Periods</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filter Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {comparisonMode === 'districts' ? (
              <>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel><Typography variant="body2">District 1</Typography></InputLabel>
                  <Select label="District 1" value={district1} onChange={(e) => setDistrict1(e.target.value)}>
                    {(districts || []).map((d) => (
                      <MenuItem key={d} value={d}>
                        <Typography variant="body2">{String(d).replaceAll('_', ' ')}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel><Typography variant="body2">District 2</Typography></InputLabel>
                  <Select label="District 2" value={district2} onChange={(e) => setDistrict2(e.target.value)}>
                    {(districts || []).map((d) => (
                      <MenuItem key={d} value={d}>
                        <Typography variant="body2">{String(d).replaceAll('_', ' ')}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel><Typography variant="body2">Year</Typography></InputLabel>
                  <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
                    {(years || []).map((y) => (
                      <MenuItem key={y} value={y}>
                        <Typography variant="body2">{String(y).replaceAll('_', ' ')}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel><Typography variant="body2">Month</Typography></InputLabel>
                  <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                    {MONTHS.map((m) => (
                      <MenuItem key={m} value={m}>
                        <Typography variant="body2">{m}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel><Typography variant="body2">District</Typography></InputLabel>
                  <Select label="District" value={timeDistrict} onChange={(e) => setTimeDistrict(e.target.value)}>
                    {(districts || []).map((d) => (
                      <MenuItem key={d} value={d}>
                        <Typography variant="body2">{String(d).replaceAll('_', ' ')}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel><Typography variant="body2">Year 1</Typography></InputLabel>
                  <Select label="Year 1" value={year1} onChange={(e) => setYear1(e.target.value)}>
                    {(years || []).map((y) => (
                      <MenuItem key={y} value={y}>
                        <Typography variant="body2">{String(y).replaceAll('_', ' ')}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel><Typography variant="body2">Month 1</Typography></InputLabel>
                  <Select label="Month 1" value={month1} onChange={(e) => setMonth1(e.target.value)}>
                    {MONTHS.map((m) => (
                      <MenuItem key={m} value={m}>
                        <Typography variant="body2">{m}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel><Typography variant="body2">Year 2</Typography></InputLabel>
                  <Select label="Year 2" value={year2} onChange={(e) => setYear2(e.target.value)}>
                    {(years || []).map((y) => (
                      <MenuItem key={y} value={y}>
                        <Typography variant="body2">{String(y).replaceAll('_', ' ')}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel><Typography variant="body2">Month 2</Typography></InputLabel>
                  <Select label="Month 2" value={month2} onChange={(e) => setMonth2(e.target.value)}>
                    {MONTHS.map((m) => (
                      <MenuItem key={m} value={m}>
                        <Typography variant="body2">{m}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            <Button variant="contained" onClick={handleApply} disabled={loading}>
              <Typography variant="button">Compare</Typography>
            </Button>
          </Stack>
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {loading && (!comparisonData || !comparisonData.chartData) ? (
        <Loader />
      ) : comparisonData?.chartData?.length > 0 ? (
        <Box>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            {comparisonMode === 'districts' 
              ? `Comparing ${district1} vs ${district2} (${year})`
              : `Comparing ${timeDistrict} - ${year1} vs ${year2}`
            }
          </Typography>

          {/* Optimized: 2 metric cards + 1 grouped chart */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {COMPARISON_METRICS.map((metric) => {
              const metricData = comparisonData.metrics[metric.key];
              if (!metricData) return null;
              
              const [item1, item2] = metricData.comparison;
              const value1 = item1?.value || 0;
              const value2 = item2?.value || 0;
              const diff = value2 - value1;
              const percentDiff = value1 !== 0 ? ((diff / value1) * 100).toFixed(1) : 0;
              
              return (
                <Card key={metric.key} elevation={2}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      {metric.label}
                    </Typography>

                    {/* Side-by-side values */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {comparisonMode === 'districts' ? item1?.name : item1?.name}
                        </Typography>
                        <Typography variant="h5" sx={{ mt: 0.5 }}>
                          {formatHumanReadable(value1)}
                        </Typography>
                        {value1 < 1000 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            {explainDigitPlaces(value1)}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {comparisonMode === 'districts' ? item2?.name : item2?.name}
                        </Typography>
                        <Typography variant="h5" sx={{ mt: 0.5 }}>
                          {formatHumanReadable(value2)}
                        </Typography>
                        {value2 < 1000 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            {explainDigitPlaces(value2)}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Difference indicator */}
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 1, 
                      bgcolor: diff >= 0 ? 'success.light' : 'error.light',
                      color: diff >= 0 ? 'success.dark' : 'error.dark'
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Difference: {diff >= 0 ? '+' : ''}{formatHumanReadable(diff)} 
                        {percentDiff !== 0 && ` (${percentDiff >= 0 ? '+' : ''}${percentDiff}%)`}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Optimized: Single grouped bar chart for both metrics */}
          <Card elevation={2} sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Combined Comparison Chart
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={comparisonData.chartData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => formatHumanReadable(value)}
                      label={{ value: 'Total Expenditure', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => formatHumanReadable(value)}
                      label={{ value: 'Avg Wage Rate', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const metric = COMPARISON_METRICS.find(m => m.key === name);
                        return [formatHumanReadable(value), metric?.label || name];
                      }}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey={COMPARISON_METRICS[0].key} 
                      fill={COMPARISON_METRICS[0].color} 
                      name={COMPARISON_METRICS[0].label}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey={COMPARISON_METRICS[1].key} 
                      fill={COMPARISON_METRICS[1].color} 
                      name={COMPARISON_METRICS[1].label}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              Select filters and click "Compare" to see comparison data
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

