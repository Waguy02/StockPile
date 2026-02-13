/**
 * Verify that invoice filenames follow:
 *   Facture_vente_[CLIENT]_[REF]_[Date].pdf
 *   Facture_achat_[FOURNISSEUR]_[REF]_[Date].pdf
 * Run from app dir: npx tsx scripts/verify-invoice-filename.ts
 */
import {
  getSaleInvoiceFilename,
  getPurchaseInvoiceFilename,
} from '../src/lib/invoicePdf';

const getCustomerName = (id: string) =>
  ({ cust1: 'Acme Corp', cust2: 'mont Cameroun S.A', cust3: 'Christine' }[id] ?? 'Inconnu');
const getProviderName = (id: string) =>
  ({ pr1: 'TechGlobal Supply', pr2: 'panache international' }[id] ?? 'Inconnu');

// Sale: Facture_vente_[CLIENT]_[REF]_[Date].pdf
const sale = {
  id: '8b4b40bb-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  customerId: 'cust3',
  initiationDate: '2026-02-10',
};
const saleFilename = getSaleInvoiceFilename(sale, getCustomerName);
const saleOk =
  saleFilename.startsWith('Facture_vente_') &&
  saleFilename.includes('Christine') &&
  saleFilename.includes('8B4B40BB') &&
  saleFilename.includes('2026-02-10') &&
  saleFilename.endsWith('.pdf');

console.log('Sale invoice filename:', saleFilename);
console.log('  Expected pattern: Facture_vente_[CLIENT]_[REF]_[Date].pdf');
console.log('  OK:', saleOk);

// Purchase: Facture_achat_[FOURNISSEUR]_[REF]_[Date].pdf
const po = {
  id: '2c9ff4d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  providerId: 'pr2',
  initiationDate: '2026-02-09',
};
const poFilename = getPurchaseInvoiceFilename(po, getProviderName);
const poOk =
  poFilename.startsWith('Facture_achat_') &&
  poFilename.includes('panache') &&
  poFilename.includes('2C9FF4D4') &&
  poFilename.includes('2026-02-09') &&
  poFilename.endsWith('.pdf');

console.log('');
console.log('Purchase invoice filename:', poFilename);
console.log('  Expected pattern: Facture_achat_[FOURNISSEUR]_[REF]_[Date].pdf');
console.log('  OK:', poOk);

const allOk = saleOk && poOk;
console.log('');
console.log(allOk ? 'All checks passed.' : 'Some checks failed.');
process.exit(allOk ? 0 : 1);
