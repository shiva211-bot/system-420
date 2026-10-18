import { StatusPage } from "@/components/StatusPage";
import { STATUS_PAGES } from "@/lib/statusPages";

export default function NotFound() {
  const copy = STATUS_PAGES["404"];
  return <StatusPage code="404" title={copy.title} message={copy.message} />;
}
