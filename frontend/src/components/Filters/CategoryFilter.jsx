const categories = [
  { id: 'all', label: 'All', icon: '🏠' },
  { id: 'apartment', label: 'Apartments', icon: '🏢' },
  { id: 'villa', label: 'Villas', icon: '🏰' },
  { id: 'farmhouse', label: 'Farmhouses', icon: '🌾' },
  { id: 'studio', label: 'Studios', icon: '🎨' },
  { id: 'shared-room', label: 'Shared', icon: '👥' },
  { id: 'treehouse', label: 'Treehouses', icon: '🌲' }
];

const CategoryFilter = ({
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange
}) => {
  return (
    <>
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8 py-4 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-col items-center ${
                selectedCategory === cat.id
                  ? 'text-rose-500'
                  : 'text-gray-600'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-sm">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-3">
        {['all', 'low', 'medium', 'high'].map(range => (
          <button
            key={range}
            onClick={() => setPriceRange(range)}
            className={`px-4 py-2 rounded-full ${
              priceRange === range
                ? 'bg-rose-500 text-white'
                : 'border'
            }`}
          >
            {range}
          </button>
        ))}
      </div>
    </>
  );
};

export default CategoryFilter;
