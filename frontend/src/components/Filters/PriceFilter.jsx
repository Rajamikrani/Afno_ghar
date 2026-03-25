const PriceFilter = ({ priceRange, setPriceRange }) => {
  const ranges = ['all', 'low', 'medium', 'high'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 flex gap-3">
      {ranges.map(range => (
        <button
          key={range}
          onClick={() => setPriceRange(range)}
          className={`px-4 py-2 rounded-full ${
            priceRange === range
              ? 'bg-rose-500 text-white'
              : 'bg-white border'
          }`}
        >
          {range === 'all' ? 'All Prices' : range}
        </button>
      ))}
    </div>
  );
};

export default PriceFilter;

