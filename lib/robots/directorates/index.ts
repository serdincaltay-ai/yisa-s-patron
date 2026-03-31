import { DIRECTORATE_PROTOCOLS, type DirectorateCode, type DirectorateProtocol } from "./protocols"

export { DIRECTORATE_PROTOCOLS }
export type { DirectorateCode, DirectorateProtocol }

export { CLO_PROTOCOL } from "./clo"
export { CFO_PROTOCOL } from "./cfo"
export { CTO_PROTOCOL } from "./cto"
export { CPO_PROTOCOL } from "./cpo"
export { CMO_PROTOCOL } from "./cmo"
export { CHRO_PROTOCOL } from "./chro"
export { CRDO_PROTOCOL } from "./crdo"
export { CISO_PROTOCOL } from "./ciso"
export { CDO_PROTOCOL } from "./cdo"
export { CSPO_PROTOCOL } from "./cspo"
export { CCO_PROTOCOL } from "./cco"
export { CSO_PROTOCOL } from "./cso"

export function getDirectorateProtocol(code: string): DirectorateProtocol | null {
  const normalized = (code || "").toUpperCase() as DirectorateCode
  return DIRECTORATE_PROTOCOLS[normalized] ?? null
}
