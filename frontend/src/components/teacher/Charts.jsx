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

export const LineChartComponent = ({ data, xKey, lines, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
      <XAxis dataKey={xKey} stroke="#94a3b8" tick={{fontSize: 12}} />
      <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          color: '#0f172a',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(4px)'
        }}
        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
      />
      <Legend />
      {lines.map((line, index) => (
        <Line
          key={index}
          type="monotone"
          dataKey={line.dataKey}
          stroke={line.color}
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

export const BarChartComponent = ({ data, xKey, bars, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
      <XAxis dataKey={xKey} stroke="#94a3b8" tick={{fontSize: 12}} />
      <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          color: '#0f172a',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(4px)'
        }}
        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
      />
      <Legend />
      {bars.map((bar, index) => (
        <Bar
          key={index}
          dataKey={bar.dataKey}
          fill={bar.color}
          radius={[4, 4, 0, 0]}
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
        innerRadius={60}
        outerRadius={80}
        paddingAngle={5}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          color: '#0f172a',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(4px)'
        }}
        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
      />
      <Legend wrapperStyle={{ paddingTop: '10px' }} />
    </PieChart>
  </ResponsiveContainer>
);

export const AreaChartComponent = ({ data, xKey, areas, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
      <XAxis dataKey={xKey} stroke="#94a3b8" tick={{fontSize: 12}} />
      <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          color: '#0f172a',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
          backdropFilter: 'blur(4px)'
        }}
        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
      />
      <Legend />
      {areas.map((area, index) => (
        <Area
          key={index}
          type="monotone"
          dataKey={area.dataKey}
          stroke={area.color}
          fill={area.color}
          fillOpacity={0.3}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);