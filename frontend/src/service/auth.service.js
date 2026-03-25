import axios from "axios";

// export const registerUser = async (data) => {
//   try {
//     const res = await axios.post(
//       `${import.meta.env.VITE_API_URL}/auth/register`,
//       data,
//       { withCredentials: true }
//     );
//     return res.data;
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//   }
// };


export const registerUser = async (data) => {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/users/register`, // make sure this matches your backend route
      data,
      { withCredentials: true }
    );
    return res.data; // return the successful response
  } catch (error) {
    // throw the error so frontend can catch it
    throw error.response?.data || { message: error.message };
  }
};



