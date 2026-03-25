const SearchDropdown = ({ activeTab, setShow, searchData, setSearchData }) => {
  return (
    <>
      <div className="fixed inset-0 bg-black/30" onClick={() => setShow(false)} />

      <div className="absolute w-full bg-white rounded-3xl shadow-xl p-6 mt-3 z-50">
        {activeTab === 'location' && (
          <input
            value={searchData.location}
            onChange={e =>
              setSearchData(prev => ({ ...prev, location: e.target.value }))
            }
            className="w-full border p-3 rounded-lg"
            placeholder="Search destinations"
          />
        )}
      </div>
    </>
  );
};

export default SearchDropdown;
