import { WorkTicketModel } from '../../core/models/work-tickets';
import { WorkItemMutationError } from '../../core/models/work-items';

export interface WorkTicketPageState {
  items: WorkTicketModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export interface WorkTicketsState {
  pages: Record<string, WorkTicketPageState>;
  item: WorkTicketModel | null;
  detailLoading: boolean;
  detailError: string | null;
  saving: boolean;
  mutationError: WorkItemMutationError | null;
}

export const initialWorkTicketsState: WorkTicketsState = {
  pages: {},
  item: null,
  detailLoading: false,
  detailError: null,
  saving: false,
  mutationError: null,
};
