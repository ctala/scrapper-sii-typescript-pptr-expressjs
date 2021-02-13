import { Actividad } from "./Actividad";

export interface Empresa {
    actividades: Actividad[];
    nombreRazonSocial: string;
    rut : string;
    inicia?: string;
    fechaInicia?: string;
    authExt?: string;
    empTam?: string;
  }