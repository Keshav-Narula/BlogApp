import Header from "./Header";
import {Outlet} from "react-router-dom";

export default function Layout() {
  return ( //Every Route has the main element and the header
    <main>
      <Header />
      <Outlet />
    </main>
  );
}