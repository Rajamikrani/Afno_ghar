const asyncHandler = (requestHandler) => {
   return (req , res , next) => {
        Promise.resolve(requestHandler(req , res , next))
        .catch((error) => next(error))
    }
}

export {asyncHandler}

/*
Call back function.
const asyncHandler = () => {} 
    
Call back function with passing a function as a parameter
const asyncHandler = (fn) => {() => {}} 

Higher Order Function with async
const asyncHandler = (fn) => async () => {}


 const asyncHandler = (fn) => async (req , res , next) => {
    try {
        await fn(req , res , next)
    } catch (error) {
        res.status(error.code || 500).json({
            success : false ,
            message : error.message
        })
    }
 }
*/