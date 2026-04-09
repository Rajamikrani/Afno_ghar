import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api/v1",
// baseURL: "https://afno-ghar.onrender.com/api/v1",
  withCredentials: true,
});

/* ══════════════════════════════════════════════════════════════════════
   REQUEST INTERCEPTOR
══════════════════════════════════════════════════════════════════════ */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ══════════════════════════════════════════════════════════════════════
   RESPONSE INTERCEPTOR
══════════════════════════════════════════════════════════════════════ */
// Public paths that should never trigger a login redirect
const PUBLIC_PATHS = ["/", "/login", "/register"];
const isPublicPath = (path) =>
  PUBLIC_PATHS.includes(path) ||
  path.startsWith("/listing/");   // /listing/:id is also public

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if the user is on a protected page
      if (!isPublicPath(window.location.pathname)) {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/* ══════════════════════════════════════════════════════════════════════
   LISTINGS
══════════════════════════════════════════════════════════════════════ */
export const fetchListings        = ()               => API.get("/listings/");
export const fetchListingById     = (id)             => API.get(`/listings/${id}`);
export const fetchSimilarListings = (id, limit = 4)  => API.get(`/listings/similar/${id}?limit=${limit}`);
export const fetchRecommendations = ()               => API.get("/listings/recommendations");
export const getMyListings        = ()               => API.get("/listings/my-listings");
export const searchListings       = (params)         => API.get("/listings/search", { params });

export const createListing = (listingData, onUploadProgress) => {
  const formData = new FormData();
  listingData.images.forEach((img) => formData.append("images", img));
  for (const key in listingData) {
    if (key === "images") continue;
    if (key === "location" || key === "amenities") {
      formData.append(key, JSON.stringify(listingData[key]));
    } else {
      formData.append(key, listingData[key]);
    }
  }
  return API.post("/listings/create-listing", formData, { onUploadProgress });
};

/* ─── FIX: updateListing was missing ─── */
export const updateListing = (id, listingData, onUploadProgress) => {
  const formData = new FormData();

  // Only append actual File objects (new uploads)
  if (listingData.images && listingData.images.length > 0) {
    listingData.images.forEach((img) => {
      if (img instanceof File) formData.append("images", img);
    });
  }

  for (const key in listingData) {
    if (key === "images" || key === "existingImages") continue;
    if (key === "location" || key === "amenities") {
      formData.append(key, JSON.stringify(listingData[key]));
    } else {
      formData.append(key, listingData[key]);
    }
  }

  return API.patch(`/listings/update-listing/${id}`, formData, { onUploadProgress });
};

/* ─── FIX: deleteListing was missing ─── */
export const deleteListing = (id) => API.delete(`/listings/delete-listing/${id}`);

/* ══════════════════════════════════════════════════════════════════════
   USERS / AUTH
══════════════════════════════════════════════════════════════════════ */
export const registerUser      = (formData) => API.post("/users/register", formData);
export const loginUser         = (payload)  => API.post("/users/login", payload);
export const logoutUser        = ()         => API.post("/users/logout", {}, { withCredentials: true });
export const getCurrentUser    = ()         => API.get("/users/current-user");
export const updateUserDetails = (data)     => API.patch("/users/update-details", data);
export const updateUserAvatar  = (fd)       => API.patch("/users/update-avatar", fd, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const fetchUserById     = (id)                => API.get(`/users/profile/${id}`);
export const fetchUserListings = (hostId, limit = 6) => API.get("/listings/all-listings", { params: { host: hostId, limit } });
export const changePassword    = (data)     => API.post("/users/change-current-password", data);
export const fetchListingHost  = (listingId)=> API.get(`/users/${listingId}/host`);

export const fetchHostListings = (hostId, limit = 6) =>
  API.get(`/listings/host/${hostId}`, { params: { limit } });

export const fetchHostReviews = (hostId, page = 1, limit = 6) =>
  API.get(`/reviews/host/${hostId}`, { params: { page, limit } });

export const fetchHostStats = (hostId) =>
  API.get(`/listings/host/${hostId}/stats`);
/* ══════════════════════════════════════════════════════════════════════
   BOOKINGS
══════════════════════════════════════════════════════════════════════ */
export const createBooking           = (payload)    => API.post("/bookings/create", payload);
export const getMyBookings           = (status)     => API.get("/bookings/my-bookings", { params: status ? { status } : {} });
export const getPastBookings         = ()           => API.get("/bookings/past-bookings");
export const checkBookingEligibility = (listingId)  => API.get(`/bookings/eligibility/${listingId}`);
export const getHostBookingRequests  = (status)     => API.get("/bookings/host-bookings", { params: status ? { status } : {} });
export const fetchBookingStats       = ()           => API.get("/bookings/stats");
export const getBookingById          = (id)         => API.get(`/bookings/${id}`);
export const fetchBookingById        = (id)         => API.get(`/bookings/${id}`);
export const checkAvailability       = (listingId, checkIn, checkOut) =>
  API.get(`/bookings/available/${listingId}`, { params: { checkIn, checkOut } });
export const updateBookingStatus     = (id, status) => API.patch(`/bookings/${id}/status`, { status });
export const cancelBooking           = (id)         => API.patch(`/bookings/${id}/cancel`);

/* ══════════════════════════════════════════════════════════════════════
   REVIEWS
══════════════════════════════════════════════════════════════════════ */
export const createReview        = (listingId, data)                 => API.post(`/reviews/create/${listingId}`, data);
export const updateReview        = (reviewId,  data)                 => API.patch(`/reviews/update/${reviewId}`, data);
export const deleteReview        = (reviewId)                        => API.delete(`/reviews/delete/${reviewId}`);
export const fetchListingReviews = (listingId, page = 1, limit = 6) =>
  API.get(`/reviews/${listingId}/reviews`, { params: { page, limit } });
export const fetchReviewStats    = (listingId) => API.get(`/reviews/${listingId}/stats`);
export const fetchReviewById     = (reviewId)  => API.get(`/reviews/${reviewId}`);
export const fetchBookingReviews = (listingId, page = 1, limit = 10) =>
  API.get(`/reviews/${listingId}/reviews`, { params: { page, limit } });

/* ══════════════════════════════════════════════════════════════════════
   WISHLIST
══════════════════════════════════════════════════════════════════════ */
export const getMyWishlist      = ()          => API.get("/wishlist/my-wishlist");
export const toggleWishlistItem = (listingId) => API.post(`/wishlist/toggle/${listingId}`);

/* ══════════════════════════════════════════════════════════════════════
   CATEGORIES & AMENITIES
══════════════════════════════════════════════════════════════════════ */
export const fetchCategories = () => API.get("/categories");
export const fetchAmenities  = async () => {
  try {
    const response = await API.get("/amenities");
    return response.data;
  } catch (err) {
    console.error("Failed to fetch amenities:", err);
    return [];
  }
};

/* ══════════════════════════════════════════════════════════════════════
   LEGACY ALIASES
══════════════════════════════════════════════════════════════════════ */
export const fetchMyBookings  = (status) =>
  API.get("/bookings/my-bookings", { params: status ? { status } : {} });
export const createBookingApi = (payload) => API.post("/bookings/create", payload);

/* ══════════════════════════════════════════════════════════════════════
   ADMIN
══════════════════════════════════════════════════════════════════════ */
export const adminGetAllUsers    = ()         => API.get("/users/all");
export const adminUpdateUserRole = (id, role) => API.patch(`/users/${id}/role`, { role });
export const adminDeleteUser     = (id)       => API.delete(`/users/${id}`);
export const adminGetUserStats   = ()         => API.get("/users/admin/stats");

export const adminDeleteListing   = (id)     => API.delete(`/listings/${id}/admin`);
export const adminGetListingStats = ()       => API.get("/listings/admin/stats");

/* ─── FIX: was duplicated, now single ─── */
export const adminGetAllListings = (params) => API.get("/listings/admin/all", { params });

export const adminGetAllBookings  = (params) => API.get("/bookings/admin/all", { params });
export const adminGetBookingStats = ()       => API.get("/bookings/stats");

export const adminGetAllReviews = (params) => API.get("/reviews/admin/all", { params });
export const adminDeleteReview  = (id)     => API.delete(`/reviews/delete/${id}`);

export const adminGetCategories  = ()           => API.get("/categories");
export const createCategory = (data) => API.post("/categories/create", data);
export const updateCategory = (id, data) => API.patch(`/categories/${id}/update`, data);
export const deleteCategory = (id) => API.delete(`/categories/${id}/delete`);
export const deactivateCategory  = (id)       => API.patch(`/categories/${id}/deactivate`);

export const adminGetAmenities   = ()         => API.get("/amenities");
export const createAmenity       = (data)     => API.post("/amenities/admin/create-amenity", data);
export const updateAmenity       = (id, data) => API.patch(`/amenities/admin/update-amenity/${id}`, data);
export const deleteAmenity       = (id)       => API.delete(`/amenities/admin/delete-amenity/${id}`);

export const adminUpdateListingStatus = (listingId, status, adminNote = "") =>
  API.patch(`/listings/${listingId}/status`, { status, adminNote });

export const adminGetAllListingsWithStatus = (params) =>
  API.get("/listings/admin/all", { params });

export default API;