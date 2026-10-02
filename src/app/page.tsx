import { Dashboard } from "../components/dashboard/dashboard";
import { loadDashboard } from "../modules/dashboard/data";
export const dynamic = "force-dynamic";
export default async function Home() { return <Dashboard data={await loadDashboard()} />; }
