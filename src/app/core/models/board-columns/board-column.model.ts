// fixed set, a part of one status (category); Doing and Done read under their status
export interface BoardColumnModel {
  id: number;
  code: string;
  name: string;
  // "In Progress · Done" when the status has several columns, otherwise the name
  label: string;
  category: number;
  order: number;
}
