import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import OverOns from './pages/OverOns'
import Speelschema from './pages/Speelschema'
import Ledenlijst from './pages/Ledenlijst'
import Uitslagen from './pages/Uitslagen'
import Informatie from './pages/Informatie'
import Afmelden from './pages/Afmelden'
import NotFound from './pages/NotFound'
import RouteError from './pages/RouteError'
import BeheerLayout from './pages/beheer/BeheerLayout'
import Dashboard from './pages/beheer/Dashboard'
import { DocumentBeheer, UitslagenBeheer } from './pages/beheer/DocumentenBeheer'
import LedenBeheer from './pages/beheer/LedenBeheer'
import AfmeldingenBeheer from './pages/beheer/AfmeldingenBeheer'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Home /> },
          { path: 'over-ons', element: <OverOns /> },
          { path: 'speelschema', element: <Speelschema /> },
          { path: 'ledenlijst', element: <Ledenlijst /> },
          { path: 'uitslagen', element: <Uitslagen /> },
          { path: 'informatie', element: <Informatie /> },
          { path: 'afmelden', element: <Afmelden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  {
    // The admin area has its own, simpler layout and is not linked in the main menu.
    path: 'beheer',
    element: <BeheerLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'uitslagen', element: <UitslagenBeheer /> },
      { path: 'document/:slug', element: <DocumentBeheer /> },
      { path: 'ledenlijst', element: <LedenBeheer /> },
      { path: 'afmeldingen', element: <AfmeldingenBeheer /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
