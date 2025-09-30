import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Box, Heading } from '@chakra-ui/react';

export interface ProgressPoint {
  label: string;
  value: number;
}

interface ProgressChartProps {
  title: string;
  data: ProgressPoint[];
  color?: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ title, data, color = '#3182CE' }) => {
  return (
    <Box borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={5} bg="white" shadow="sm">
      <Heading size="sm" mb={4} color="gray.700">
        {title}
      </Heading>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="label" stroke="#A0AEC0" tick={{ fontSize: 12 }} />
          <YAxis stroke="#A0AEC0" tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#chartColor)" />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ProgressChart;
