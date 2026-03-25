import { Heart, MapPin, Star } from 'lucide-react';

const ListingCard = ({ listing, onToggleFavorite }) => {
  return (
    <div className="cursor-pointer">
      <div className="relative">
        <img
          src={listing.images[0]}
          alt={listing.title}
          className="h-64 w-full object-cover rounded-xl"
        />
        <button
          onClick={() => onToggleFavorite(listing._id)}
          className="absolute top-3 right-3 bg-white p-2 rounded-full"
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

      <div className="mt-2">
        <h3 className="font-semibold truncate">{listing.title}</h3>
        <div className="text-sm text-gray-600 flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {listing.location.city}, {listing.location.country}
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-black" />
          {listing.averageRating}
        </div>
        <div className="font-semibold">${listing.price} / night</div>
      </div>
    </div>
  );
};

export default ListingCard;
