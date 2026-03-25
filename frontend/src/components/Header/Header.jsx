import { Search } from 'lucide-react';

const Header = ({
  searchData,
  setSearchData,
  showSearchDropdown,
  setShowSearchDropdown,
  activeSearchTab,
  setActiveSearchTab
}) => {
  const handleSearch = () => {
    setShowSearchDropdown(false);
    console.log(searchData);
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-rose-500">Afno Ghar</div>
        </div>

        <div className="relative max-w-4xl mx-auto mt-4">
          <div className="bg-white border rounded-full shadow-lg flex items-center">
            <button
              onClick={() => {
                setShowSearchDropdown(true);
                setActiveSearchTab('location');
              }}
              className="flex-1 px-6 py-3 text-left"
            >
              <div className="text-xs font-semibold">Where</div>
              <div className="text-sm text-gray-400">
                {searchData.location || 'Search destinations'}
              </div>
            </button>

            <button
              onClick={handleSearch}
              className="mr-2 p-3 bg-rose-500 text-white rounded-full"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
