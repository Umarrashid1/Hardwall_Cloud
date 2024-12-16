const { parseKeypressData } = require('../Utilities/keypressParser'); // Adjust the path if needed

describe('parseKeypressData', () => {
    test('Single key press and release', () => {
        const keypressData = [
            { timestamp: '2024-12-15 14:00:00.000', data: ['0', '0', '4', '0', '0', '0', '0', '0'] }, // Press A
            { timestamp: '2024-12-15 14:00:00.100', data: ['0', '0', '0', '0', '0', '0', '0', '0'] }, // Release A
        ];

        const result = parseKeypressData(keypressData);

        expect(result).toEqual([
            { VK: 65, HT: 100, FT: -1 }, // A held for 100ms
        ]);
    });

    test('Multiple keys pressed and released sequentially', () => {
        const keypressData = [
            { timestamp: '2024-12-15 14:00:00.000', data: ['0', '0', '4', '0', '0', '0', '0', '0'] }, // Press A
            { timestamp: '2024-12-15 14:00:00.100', data: ['0', '0', '0', '0', '0', '0', '0', '0'] }, // Release A
            { timestamp: '2024-12-15 14:00:00.200', data: ['0', '0', '5', '0', '0', '0', '0', '0'] }, // Press B
            { timestamp: '2024-12-15 14:00:00.400', data: ['0', '0', '0', '0', '0', '0', '0', '0'] }, // Release B
        ];

        const result = parseKeypressData(keypressData);

        expect(result).toEqual([
            { VK: 65, HT: 100, FT: -1 },  // A held for 100ms
            { VK: 66, HT: 200, FT: 100 }, // B held for 200ms, FT=100ms from A release to B press
        ]);
    });

    test('Simultaneous key presses and releases', () => {
        const keypressData = [
            { timestamp: '2024-12-15 14:00:00.000', data: ['0', '0', '4', '5', '0', '0', '0', '0'] }, // Press A and B
            { timestamp: '2024-12-15 14:00:00.100', data: ['0', '0', '4', '0', '0', '0', '0', '0'] }, // Release B
            { timestamp: '2024-12-15 14:00:00.200', data: ['0', '0', '0', '0', '0', '0', '0', '0'] }, // Release A
        ];

        const result = parseKeypressData(keypressData);

        expect(result).toEqual([
            { VK: 65, HT: 200, FT: -1 },  // A held for 200ms
            { VK: 66, HT: 100, FT: -1 },  // B held for 100ms
        ]);
    });

    test('No keys pressed', () => {
        const keypressData = [
            { timestamp: '2024-12-15 14:00:00.000', data: ['0', '0', '0', '0', '0', '0', '0', '0'] },
        ];

        const result = parseKeypressData(keypressData);

        expect(result).toEqual([]); // No output for empty reports
    });

    test('Unclosed key press (missing release)', () => {
        const keypressData = [
            { timestamp: '2024-12-15 14:00:00.000', data: ['0', '0', '4', '0', '0', '0', '0', '0'] }, // Press A
        ];

        const result = parseKeypressData(keypressData);

        expect(result).toEqual([
            { VK: 65, HT: -1, FT: -1 }, // A unclosed key press with HT=-1
        ]);
    });

    test('Complex scenario with overlapping keys', () => {
        const keypressData = [
            { timestamp: '2024-12-15 14:00:00.000', data: ['0', '0', '4', '5', '0', '0', '0', '0'] }, // Press A and B
            { timestamp: '2024-12-15 14:00:00.050', data: ['0', '0', '4', '0', '0', '0', '0', '0'] }, // Release B
            { timestamp: '2024-12-15 14:00:00.100', data: ['0', '0', '5', '0', '0', '0', '0', '0'] }, // Press B
            { timestamp: '2024-12-15 14:00:00.150', data: ['0', '0', '0', '0', '0', '0', '0', '0'] }, // Release A and B
        ];

        const result = parseKeypressData(keypressData);

        console.log(result);
        expect(result).toEqual([
            { VK: 65, HT: 150, FT: -1 },  // A released after 150ms
            { VK: 66, HT: 50, FT: -1 },   // B held for 50ms
            { VK: 66, HT: 50, FT: 50 },   // B pressed again for 50ms
        ]);
    });
});