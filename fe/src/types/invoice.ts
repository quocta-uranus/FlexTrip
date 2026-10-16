export interface Invoice {
  invoiceNumber: string;
  issuedAt: string;
  booking: {
    id: string;
    startDate: string;
    endDate: string;
    nights: number;
    quantity: number;
    deliveryMethod?: string | null;
    deliveryAddress?: string | null;
  };
  listing: {
    title: string;
    location: string;
    category: string;
    unitPrice: number;
    currency: string;
  };
  traveler: { name: string; email: string };
  provider: { name: string; email: string };
  payment: {
    status: string;
    gateway: string;
    totalAmount: number;
    rentalAmount: number;
    depositAmount: number;
    paidAt: string | null;
  };
}
