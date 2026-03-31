import { redirect } from "next/navigation"

export const metadata = {
  title: "Dashboard | YİSA-S Patron",
  description: "Patron paneli — tablet komut merkezi",
}

/**
 * Patron dashboard artik tablet gorunumune yonlendiriyor.
 * Eski uzun-scroll dashboard yerine tap-to-open tablet mantigi kullaniliyor.
 */
export default function PatronDashboardPage() {
  redirect("/patron/tablet")
}
