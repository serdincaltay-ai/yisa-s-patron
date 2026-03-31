import PatronHub from "../components/PatronHub"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Patron | YİSA-S",
  description: "CELF komut merkezi — ASK, SESSION, TALEPLER",
}

export default async function PatronPage({
  searchParams,
}: {
  searchParams: Promise<{ classic?: string }>
}) {
  const params = await searchParams
  if (params?.classic === "1") {
    return <PatronHub />
  }
  redirect("/patron/tablet")
}
