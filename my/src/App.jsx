import { Suspense, lazy } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Header, { MobileTabBar } from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import { NotFound, PageLoader, Private, ScrollManager, SkipLink, Toast } from "./components/ui";
import Home from "./pages/Home";
import "./App.css";

// Pages below the home page load on demand (the admin chart library is the heaviest).
const Catalog = lazy(() => import("./pages/Catalog"));
const PlaceDetails = lazy(() => import("./pages/PlaceDetails"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const AuthPage = lazy(() => import("./pages/Auth"));
const OAuthCallback = lazy(() => import("./pages/Auth").then((m) => ({ default: m.OAuthCallback })));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));
const Credits = lazy(() => import("./pages/Credits"));

// A fresh page state (date, guests…) for every tour.
function PlaceRoute() {
  const { id } = useParams();
  return <PlaceDetails key={id} />;
}

export default function App() {
  return (
    <AppProvider>
      <div className="app-shell">
        <SkipLink />
        <ScrollManager />
        <Header />
        <div id="content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/places" element={<Catalog />} />
              <Route path="/places/:id" element={<PlaceRoute />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/login" element={<AuthPage mode="login" key="login" />} />
              <Route path="/register" element={<AuthPage mode="register" key="register" />} />
              <Route path="/auth/oauth/:provider" element={<OAuthCallback />} />
              <Route path="/account" element={<Private><Account /></Private>} />
              <Route path="/admin" element={<Private admin><Admin /></Private>} />
              <Route path="/credits" element={<Credits />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
        <Footer />
        <ChatWidget />
        <MobileTabBar />
        <Toast />
      </div>
    </AppProvider>
  );
}
