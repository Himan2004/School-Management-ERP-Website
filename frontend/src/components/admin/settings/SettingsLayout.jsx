const SettingsLayout = ({ sidebar, children }) => {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)] text-gray-900">
      <aside>{sidebar}</aside>
      <section>{children}</section>
    </div>
  );
};

export default SettingsLayout;
