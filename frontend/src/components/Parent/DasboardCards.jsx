export default function DashboardCards({ cards = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 mb-8">
      {cards.map((card) => (
        <button
          key={card.title}
          type="button"
          onClick={card.onClick}
          className={`relative overflow-hidden bg-gradient-to-br ${card.color} p-8 rounded-[1rem] shadow-xl hover:shadow-2xl transition-all cursor-pointer group text-left`}
        >
          <div className="absolute right-6 top-1/2 -translate-y-1/2 transition-transform group-hover:scale-110 duration-500">
            {card.icon}
          </div>
          <div className="relative z-10 text-white">
            <p className="text-sm font-bold opacity-80 uppercase tracking-wider">
              {card.title}
            </p>
            <h2 className="text-2xl font-black mt-2 mb-2 tracking-tighter">
              {card.value}
            </h2>
            <div className="flex items-center gap-1 text-xs font-bold opacity-90">
              {card.trendIcon}
              <span>{card.trend}</span>
            </div>
          </div>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      ))}
    </div>
  );
}