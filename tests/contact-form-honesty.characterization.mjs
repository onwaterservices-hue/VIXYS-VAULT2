// CHARACTERIZATION -- the contact form does not pretend to create a ticket.
//
// ContactView waited 1.2s and showed "Ticket Created Successfully" with a random
// TICKET-NNNNNN reference, but sent nothing: no API call, no server route, so
// every support request was lost. It also showed an "ONLINE" badge and a
// security address on a domain the product does not use (security@vixysvault.com).
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('contact-form-honesty.characterization');
const src = readRepoFile('src/components/ContactView.tsx').replace(/\/\/[^\n]*/g, '');

t.check('no random ticket reference', !/Math\.random/.test(src) && !/TICKET-/.test(src));
t.check('no "Ticket Created Successfully"', !src.includes('Ticket Created Successfully'));
t.check('no fake submit delay', !/setTimeout\(/.test(src));
t.check('opens an email draft to the support inbox', /mailto:\$\{SUPPORT_EMAIL\}\?subject=\$\{encodeURIComponent\(/.test(src) && src.includes("const SUPPORT_EMAIL = 'vixyvault0@gmail.com';"));
t.check('says plainly that nothing is sent from the page', src.includes('nothing is sent from this page, and no ticket is created'));
t.check('no ONLINE badge', !/>ONLINE</.test(src));
t.check('no address on the vixysvault.com domain', !src.includes('@vixysvault.com'));

t.done();
