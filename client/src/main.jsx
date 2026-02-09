import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Login from './login.jsx'
import Registration from './registration.jsx'
import Profile from './profile.jsx'
import CurrentStatus from './status.jsx'
// Nav bar is only shown on the home page now
import Home from './home.jsx'

function AppLayout() {
  return (
    <>
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'register', element: <Registration /> },
      { path: 'login', element: <Login /> },
      { path: 'home', element: <Home /> },
      { path: 'profile', element: <Profile /> },
      { path: 'status', element: <CurrentStatus /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
