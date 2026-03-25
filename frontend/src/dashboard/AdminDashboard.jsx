import React, { useState } from 'react';
import { 
  Home, Users, Building2, Calendar, UserCircle, FileText, 
  Settings, LogOut, Search, Bell, ChevronDown, Eye, Edit, 
  Trash2, Menu, X 
} from 'lucide-react';

// Dummy Data
const statsData = [
  { id: 1, title: 'Total Users', value: '12,450', icon: Users, color: 'bg-blue-500' },
  { id: 2, title: 'Total Hosts', value: '3,240', icon: UserCircle, color: 'bg-green-500' },
  { id: 3, title: 'Total Listings', value: '8,760', icon: Building2, color: 'bg-purple-500' },
  { id: 4, title: 'Total Bookings', value: '15,890', icon: Calendar, color: 'bg-orange-500' },
];

const bookingsData = [
  { id: 'BK001', guest: 'John Doe', property: 'Luxury Villa Bali', date: '2024-02-15', status: 'Approved' },
  { id: 'BK002', guest: 'Sarah Smith', property: 'Beach House Miami', date: '2024-02-18', status: 'Pending' },
  { id: 'BK003', guest: 'Mike Johnson', property: 'Mountain Cabin Aspen', date: '2024-02-20', status: 'Approved' },
  { id: 'BK004', guest: 'Emily Davis', property: 'City Loft NYC', date: '2024-02-22', status: 'Cancelled' },
  { id: 'BK005', guest: 'David Wilson', property: 'Lake House Seattle', date: '2024-02-25', status: 'Pending' },
];

const hostsData = [
  { id: 1, name: 'Alice Cooper', email: 'alice@example.com', status: 'Active' },
  { id: 2, name: 'Bob Martin', email: 'bob@example.com', status: 'Active' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', status: 'Suspended' },
  { id: 4, name: 'Dan Brown', email: 'dan@example.com', status: 'Active' },
];

const listingsData = [
  { id: 1, image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400', title: 'Modern Beach House', location: 'Malibu, CA', price: 350, status: 'Active' },
  { id: 2, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400', title: 'Cozy Mountain Cabin', location: 'Aspen, CO', price: 220, status: 'Active' },
  { id: 3, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400', title: 'Luxury Downtown Loft', location: 'New York, NY', price: 480, status: 'Inactive' },
  { id: 4, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400', title: 'Lake View Cottage', location: 'Seattle, WA', price: 280, status: 'Active' },
];

// Sidebar Component
const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const [activeItem, setActiveItem] = useState('Dashboard');
  
  const menuItems = [
    { name: 'Dashboard', icon: Home },
    { name: 'Hosts', icon: UserCircle },
    { name: 'Listings', icon: Building2 },
    { name: 'Bookings', icon: Calendar },
    { name: 'Users', icon: Users },
    { name: 'Reports', icon: FileText },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">AirNest Admin</span>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveItem(item.name)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  activeItem === item.name
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Navbar Component
const Navbar = ({ setIsMobileOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden text-gray-600 hover:text-gray-800"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings, hosts, listings..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-xl transition-all"
            >
              <img
                src="https://ui-avatars.com/api/?name=Admin+User&background=4f46e5&color=fff"
                alt="Admin"
                className="w-8 h-8 rounded-full"
              />
              <span className="hidden md:block text-sm font-medium text-gray-700">Admin User</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</a>
                <hr className="my-2" />
                <a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Logout</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Booking Table Component
const BookingTable = () => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookingsData.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{booking.guest}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{booking.property}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{booking.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 transition-colors">
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Host Management Component
const HostManagement = () => {
  const [hosts, setHosts] = useState(hostsData);

  const toggleStatus = (id) => {
    setHosts(hosts.map(host => 
      host.id === id 
        ? { ...host, status: host.status === 'Active' ? 'Suspended' : 'Active' }
        : host
    ));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Host Management</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hosts.map((host) => (
            <div key={host.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${host.name}&background=random`}
                    alt={host.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">{host.name}</h3>
                    <p className="text-sm text-gray-500">{host.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(host.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    host.status === 'Active'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {host.status}
                </button>
              </div>
              <button className="w-full mt-2 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                View Profile
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Listing Management Component
const ListingManagement = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Listing Management</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {listingsData.map((listing) => (
            <div key={listing.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{listing.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{listing.location}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-indigo-600">${listing.price}/night</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    listing.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {listing.status}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button className="flex items-center justify-center px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const AdminDashboard = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      
      <div className="lg:ml-64">
        <Navbar setIsMobileOpen={setIsMobileOpen} />
        
        <main className="p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            {statsData.map((stat) => (
              <StatsCard
                key={stat.id}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>

          {/* Recent Bookings */}
          <div className="mb-6">
            <BookingTable />
          </div>

          {/* Host Management */}
          <div className="mb-6">
            <HostManagement />
          </div>

          {/* Listing Management */}
          <div className="mb-6">
            <ListingManagement />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
