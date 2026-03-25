import { Heart, MapPin, Star, Users, Bed, Bath } from 'lucide-react';

const ListingsGrid = ({ listings, loading, toggleFavorite }) => {
  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  if (!listings.length) {
    return <div className="text-center py-20">No listings found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {listings.map(listing => (
        <div key={listing._id} className="group">
          <div className="relative">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-64 object-cover rounded-xl"
            />
            <button
              onClick={() => toggleFavorite(listing._id)}
              className="absolute top-3 right-3 p-2 bg-white rounded-full"
            >
              <Heart
                className={
                  listing.isGuestFavourite
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-gray-700'
                }
              />
            </button>
          </div>

          <div className="mt-3">
            <h3 className="font-semibold">{listing.title}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              {listing.location.city}
            </div>

            <div className="flex gap-2 text-sm mt-1">
              <Users className="w-4 h-4" /> {listing.maxGuests}
              <Bed className="w-4 h-4" /> {listing.bedrooms}
              <Bath className="w-4 h-4" /> {listing.bathrooms}
            </div>

            <div className="flex items-center mt-2">
              <Star className="w-4 h-4 fill-black" />
              {listing.averageRating}
            </div>

            <div className="font-semibold mt-1">
              ${listing.price} / night
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListingsGrid;
