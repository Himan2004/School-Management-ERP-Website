import React from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// --- Custom Tooltip for better UI ---
const CustomTooltipStyle = { 
  backgroundColor: '#ffffff', 
  border: 'none',
  borderRadius: '1rem',
  color: '#0f172a',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  padding: '10px'
};

export const LineChartComponent = ({ data, xKey, lines, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
      <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={CustomTooltipStyle} />
      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
      {lines.map((line, index) => (
        <Line
          key={index}
          type="monotone"
          dataKey={line.dataKey}
          name={line.name}
          stroke={line.color}
          strokeWidth={3}
          dot={{ r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

export const BarChartComponent = ({ data, xKey, bars, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
      <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={14} tickLine={false} axisLine={false} />
      <YAxis stroke="#94a3b8" fontSize={15} tickLine={false} axisLine={false} />
      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={CustomTooltipStyle} />
      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
      {bars.map((bar, index) => (
        <Bar
          key={index}
          dataKey={bar.dataKey}
          name={bar.name} // This will show "You" or "Others"
          fill={bar.color}
          radius={[6, 6, 0, 0]}
          barSize={bar.dataKey === 'you' ? 25 : 20} // Making "You" bar slightly thicker
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export const PieChartComponent = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={70}
        outerRadius={90}
        paddingAngle={8}
        dataKey="value"
        stroke="none"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip contentStyle={CustomTooltipStyle} />
      <Legend iconType="circle" />
    </PieChart>
  </ResponsiveContainer>
);

export const AreaChartComponent = ({ data, xKey, areas, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <defs>
        {areas.map((area, index) => (
          <linearGradient key={`grad-${index}`} id={`colorArea-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={area.color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={area.color} stopOpacity={0}/>
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
      <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={CustomTooltipStyle} />
      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
      {areas.map((area, index) => (
        <Area
          key={index}
          type="monotone"
          dataKey={area.dataKey}
          name={area.name}
          stroke={area.color}
          strokeWidth={3}
          fillOpacity={1}
          fill={`url(#colorArea-${index})`}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);