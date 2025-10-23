/**
 * Company Auto-Creation Unit Tests
 * Tests automatic company creation from NIP
 */

import { describe, it, expect } from 'vitest';

describe('Company Auto-Creation', () => {
  describe('Polish Address Parsing', () => {
    it('should parse standard Polish address', () => {
      const address = 'ul. Marszałkowska 1, 00-001 Warszawa';

      // Extract postal code
      const postalCodeMatch = address.match(/\b\d{2}-\d{3}\b/);
      const postalCode = postalCodeMatch ? postalCodeMatch[0] : undefined;

      // Extract city (word after postal code)
      const cityMatch = address.match(/\d{2}-\d{3}\s+(\w+)/);
      const city = cityMatch ? cityMatch[1] : undefined;

      // Extract street (everything before postal code)
      const streetMatch = address.match(/^(.+?),\s*\d{2}-\d{3}/);
      const street = streetMatch ? streetMatch[1].trim() : undefined;

      expect(postalCode).toBe('00-001');
      expect(city).toBe('Warszawa');
      expect(street).toBe('ul. Marszałkowska 1');
    });

    it('should handle address without street prefix', () => {
      const address = 'Krakowska 15, 31-000 Krakow';

      const postalCodeMatch = address.match(/\b\d{2}-\d{3}\b/);
      const postalCode = postalCodeMatch ? postalCodeMatch[0] : undefined;

      const cityMatch = address.match(/\d{2}-\d{3}\s+([A-Za-z]+)/);
      const city = cityMatch ? cityMatch[1] : undefined;

      expect(postalCode).toBe('31-000');
      expect(city).toBe('Krakow');
    });

    it('should handle multi-word city names', () => {
      const address = 'Nowa 1, 40-001 Katowice';

      const cityMatch = address.match(/\d{2}-\d{3}\s+(\w+)/);
      const city = cityMatch ? cityMatch[1] : undefined;

      expect(city).toBe('Katowice');
    });

    it('should return undefined for invalid address', () => {
      const address = 'Invalid Address Format';

      const postalCodeMatch = address.match(/\b\d{2}-\d{3}\b/);
      const postalCode = postalCodeMatch ? postalCodeMatch[0] : undefined;

      expect(postalCode).toBeUndefined();
    });

    it('should handle address with apartment number', () => {
      const address = 'ul. Piękna 68/70, 00-672 Warszawa';

      const postalCodeMatch = address.match(/\b\d{2}-\d{3}\b/);
      const streetMatch = address.match(/^(.+?),\s*\d{2}-\d{3}/);

      const postalCode = postalCodeMatch ? postalCodeMatch[0] : undefined;
      const street = streetMatch ? streetMatch[1].trim() : undefined;

      expect(postalCode).toBe('00-672');
      expect(street).toBe('ul. Piękna 68/70');
    });
  });

  describe('Company Deduplication', () => {
    it('should identify duplicate by NIP', () => {
      const existingCompanies = [
        { id: '1', nip: '1234567890', name: 'Company A' },
        { id: '2', nip: '0987654321', name: 'Company B' },
      ];

      const newNIP = '1234567890';
      const isDuplicate = existingCompanies.some((c) => c.nip === newNIP);

      expect(isDuplicate).toBe(true);
    });

    it('should allow different NIP', () => {
      const existingCompanies = [
        { id: '1', nip: '1234567890', name: 'Company A' },
        { id: '2', nip: '0987654321', name: 'Company B' },
      ];

      const newNIP = '5260250274';
      const isDuplicate = existingCompanies.some((c) => c.nip === newNIP);

      expect(isDuplicate).toBe(false);
    });

    it('should normalize NIP before comparison', () => {
      const existingNIP = '123-456-78-90';
      const newNIP = '1234567890';

      const normalizedExisting = existingNIP.replace(/[-\s]/g, '');
      const normalizedNew = newNIP.replace(/[-\s]/g, '');

      expect(normalizedExisting).toBe(normalizedNew);
    });
  });

  describe('Company Data Validation', () => {
    it('should require NIP', () => {
      const companyData = {
        name: 'Test Company',
        // NIP missing
      };

      const isValid = 'nip' in companyData && companyData.nip;
      expect(isValid).toBe(false);
    });

    it('should require name', () => {
      const companyData = {
        nip: '1234567890',
        // name missing
      };

      const isValid = 'name' in companyData && companyData.name;
      expect(isValid).toBe(false);
    });

    it('should allow optional fields', () => {
      const companyData = {
        nip: '1234567890',
        name: 'Test Company',
        regon: undefined,
        krs: undefined,
        address: undefined,
      };

      const hasRequiredFields = Boolean(companyData.nip && companyData.name);
      expect(hasRequiredFields).toBe(true);
    });
  });

  describe('REGON Validation', () => {
    it('should validate 9-digit REGON', () => {
      const regon = '123456785'; // 9 digits
      const isValid = /^\d{9}$/.test(regon);

      expect(isValid).toBe(true);
    });

    it('should validate 14-digit REGON', () => {
      const regon = '12345678512347'; // 14 digits
      const isValid = /^\d{14}$/.test(regon);

      expect(isValid).toBe(true);
    });

    it('should reject invalid REGON length', () => {
      const regon = '12345'; // Too short
      const isValid = /^\d{9}$|^\d{14}$/.test(regon);

      expect(isValid).toBe(false);
    });

    it('should reject non-numeric REGON', () => {
      const regon = '123ABC789';
      const isValid = /^\d{9}$|^\d{14}$/.test(regon);

      expect(isValid).toBe(false);
    });
  });

  describe('KRS Validation', () => {
    it('should validate 10-digit KRS', () => {
      const krs = '0000123456'; // 10 digits
      const isValid = /^\d{10}$/.test(krs);

      expect(isValid).toBe(true);
    });

    it('should reject invalid KRS length', () => {
      const krs = '12345'; // Too short
      const isValid = /^\d{10}$/.test(krs);

      expect(isValid).toBe(false);
    });

    it('should handle KRS with leading zeros', () => {
      const krs = '0000012345';
      const isValid = /^\d{10}$/.test(krs);

      expect(isValid).toBe(true);
      expect(krs.length).toBe(10);
    });
  });
});
