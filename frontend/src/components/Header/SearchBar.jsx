import { useState } from 'react';
import { Search } from 'lucide-react';
import SearchDropdown from './SearchDropdown';

const SearchBar = ({ searchData, setSearchData }) => {
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState('location');

  const getGuestsText = () => {
    const { adults, children } = searchData.guests;
    const total = adults + children;
    return total === 0 ? 'Add guests' : `${total} guests`;
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="bg-white border rounded-full shadow-lg flex">
        <button onClick={() => { setShow(true); setTab('location'); }} className="flex-1 px-6 py-3">
          {searchData.location || 'Search destinations'}
        </button>

        <button onClick={() => { setShow(true); setTab('checkin'); }} className="flex-1 px-6 py-3">
          {searchData.checkIn || 'Add dates'}
        </button>

        <button onClick={() => { setShow(true); setTab('checkout'); }} className="flex-1 px-6 py-3">
          {searchData.checkOut || 'Add dates'}
        </button>

        <button onClick={() => { setShow(true); setTab('guests'); }} className="flex-1 px-6 py-3">
          {getGuestsText()}
        </button>

        <button className="mr-2 p-3 bg-rose-500 text-white rounded-full">
          <Search />
        </button>
      </div>

      {show && (
        <SearchDropdown
          activeTab={tab}
          setShow={setShow}
          searchData={searchData}
          setSearchData={setSearchData}
        />
      )}
    </div>
  );
};

export default SearchBar;
