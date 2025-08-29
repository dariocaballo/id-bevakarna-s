import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Sales = lazy(() => import("./pages/Sales"));
const Admin = lazy(() => import("./pages/Admin"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/sales" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/sales" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
