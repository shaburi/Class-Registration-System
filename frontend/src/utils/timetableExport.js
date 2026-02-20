import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Solid color palette for print (no gradients, no transparency).
 * Maps deterministically by subject code hash, same as on-screen.
 */
const PRINT_COLORS = [
    { bg: '#3b82f6', text: '#ffffff' }, // blue
    { bg: '#e11d48', text: '#ffffff' }, // rose
    { bg: '#059669', text: '#ffffff' }, // emerald
    { bg: '#d97706', text: '#ffffff' }, // amber
    { bg: '#0891b2', text: '#ffffff' }, // cyan
    { bg: '#7c3aed', text: '#ffffff' }, // violet
    { bg: '#374151', text: '#e5e7eb' }, // gray
    { bg: '#dc2626', text: '#ffffff' }, // red
    { bg: '#65a30d', text: '#ffffff' }, // lime
    { bg: '#0369a1', text: '#e0f2fe' }, // sky
];

const getPrintColor = (code) => {
    if (!code) return PRINT_COLORS[0];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PRINT_COLORS[Math.abs(hash) % PRINT_COLORS.length];
};

/**
 * Build a clean, print-friendly timetable DOM element entirely with inline styles.
 * No Tailwind, no gradients, no backdrop-blur — just simple HTML that html2canvas
 * can render perfectly every time.
 */
const buildPrintTimetable = (sourceElementId) => {
    const sourceEl = document.getElementById(sourceElementId);
    if (!sourceEl) throw new Error('Source element not found');

    const isDark = document.body.classList.contains('dark');
    const bgColor = isDark ? '#1f2937' : '#f9fafb';
    const gridBg = isDark ? '#111827' : '#ffffff';
    const borderColor = isDark ? '#374151' : '#d1d5db';
    const headerBg = isDark ? '#1f2937' : '#e5e7eb';
    const headerText = isDark ? '#e5e7eb' : '#111827';
    const dayText = isDark ? '#93c5fd' : '#4338ca';

    // Parse the timetable data from the existing DOM
    // Find the desktop grid - even if hidden on mobile, it's still in the DOM
    const desktopGrid = sourceEl.querySelector('.hidden.md\\:block')
        || sourceEl.querySelector('[class*="md:block"]')
        || sourceEl;

    // Try to extract period count from the grid template columns
    const gridEl = desktopGrid.querySelector('[style*="gridTemplateColumns"]');
    let totalPeriods = 14; // default
    if (gridEl) {
        const match = gridEl.style.gridTemplateColumns.match(/repeat\((\d+)/);
        if (match) totalPeriods = parseInt(match[1]);
    }

    // Generate period headers deterministically (start at 8:00 AM)
    const startHour = 8;
    const periodHeaders = [];
    for (let i = 0; i < totalPeriods; i++) {
        const h = startHour + i;
        const startStr = `${String(h).padStart(2, '0')}:00`;
        const endStr = `${String(h + 1).padStart(2, '0')}:00`;
        periodHeaders.push({
            name: String(i + 1),
            time: `${startStr}-${endStr}`
        });
    }

    // Extract day rows and their events
    const dayRows = [];
    const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const dayAbbrevs = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    // Try extracting from desktop grid first (inline styles survive display:none)
    const rows = desktopGrid.querySelectorAll('.flex.border-b');

    if (rows.length > 0) {
        rows.forEach((row) => {
            const dayLabel = row.querySelector('.flex-shrink-0');
            if (!dayLabel) return;
            const dayName = dayLabel.textContent?.trim() || '';
            if (!dayName) return;

            const eventsContainer = row.querySelector('.flex-1.relative');
            if (!eventsContainer) return;

            const rowHeight = parseInt(eventsContainer.style.height) || 88;
            const events = [];

            const eventCards = eventsContainer.querySelectorAll('[style*="left"]');
            eventCards.forEach(card => {
                const style = card.style;
                const left = parseFloat(style.left) || 0;
                const width = parseFloat(style.width) || 0;
                const top = parseFloat(style.top) || 0;
                const height = parseFloat(style.height) || 88;

                const allText = card.querySelectorAll('div, span');
                const texts = [];
                allText.forEach(el => {
                    const t = el.textContent?.trim();
                    if (t && !el.querySelector('div, span') && t.length > 0) {
                        texts.push(t);
                    }
                });

                const subjectCode = texts[0] || '';
                const subjectName = texts[1] || '';
                const section = texts.find(t => t.startsWith('Sec')) || '';
                const room = texts.find(t => !t.startsWith('Sec') && texts.indexOf(t) > 2) || '';
                const lecturer = texts[texts.length - 1] || '';

                events.push({ left, width, top, height, subjectCode, subjectName, section, room, lecturer });
            });

            dayRows.push({ dayName, rowHeight, events });
        });
    }

    // Fallback: If desktop grid returned no data (e.g. on mobile), extract from mobile agenda view
    if (dayRows.length === 0 || dayRows.every(r => r.events.length === 0)) {
        dayRows.length = 0; // Clear

        // Look for the mobile agenda view (block md:hidden)
        const mobileView = sourceEl.querySelector('.block.md\\:hidden')
            || sourceEl.querySelector('[class*="md:hidden"]');

        if (mobileView) {
            // Each day section has a header with the day name and event cards
            const daySections = mobileView.children;
            const trackHeight = 88;

            // Build a map of day -> events from mobile agenda
            const dayEventsMap = {};

            for (const section of daySections) {
                if (!section || section.nodeType !== 1) continue;

                // Find day label (inside a h3 or bold text)
                const dayHeader = section.querySelector('h3');
                if (!dayHeader) continue;
                const dayName = dayHeader.textContent?.trim()?.toUpperCase() || '';
                if (!dayName) continue;

                // Find the short day name
                const abbrev = dayAbbrevs[allDays.indexOf(dayName)] || dayName.substring(0, 3);
                dayEventsMap[abbrev] = [];

                // Extract events from the day section
                const eventEls = section.querySelectorAll('[class*="rounded-xl"]');
                eventEls.forEach(el => {
                    const allText = el.querySelectorAll('div, span');
                    const texts = [];
                    allText.forEach(textEl => {
                        const t = textEl.textContent?.trim();
                        if (t && !textEl.querySelector('div, span') && t.length > 0) {
                            texts.push(t);
                        }
                    });

                    const subjectCode = texts[0] || '';
                    // Try to find time string like "14:00 - 16:00"
                    const timeText = texts.find(t => /\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/.test(t)) || '';
                    const subjectName = texts.find(t => t !== subjectCode && !t.startsWith('Sec') && !/\d{2}:\d{2}/.test(t) && t !== 'Swap' && t !== 'Drop') || '';
                    const section_text = texts.find(t => t.startsWith('Sec')) || '';
                    const room = texts.find(t => /^[A-Z0-9]{2,}/.test(t) && !t.startsWith('Sec') && t !== subjectCode && !/\d{2}:\d{2}/.test(t) && t !== 'Swap' && t !== 'Drop') || '';
                    const lecturer = texts.find(t => t !== subjectCode && t !== subjectName && !t.startsWith('Sec') && !/\d{2}:\d{2}/.test(t) && t !== room && t !== 'Swap' && t !== 'Drop') || '';

                    // Compute left/width from time
                    let left = 0, width = (1 / totalPeriods) * 100;
                    if (timeText) {
                        const match = timeText.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
                        if (match) {
                            const startH = parseInt(match[1]);
                            const startM = parseInt(match[2]);
                            const endH = parseInt(match[3]);
                            const endM = parseInt(match[4]);
                            const startIndex = (startH - startHour) + startM / 60;
                            const endIndex = (endH - startHour) + endM / 60;
                            const duration = endIndex - startIndex;
                            left = (startIndex / totalPeriods) * 100;
                            width = (duration / totalPeriods) * 100;
                        }
                    }

                    dayEventsMap[abbrev].push({
                        left, width, top: 0, height: trackHeight,
                        subjectCode, subjectName, section: section_text, room, lecturer
                    });
                });
            }

            // Build dayRows in correct order
            dayAbbrevs.forEach(abbrev => {
                dayRows.push({
                    dayName: abbrev,
                    rowHeight: 88,
                    events: dayEventsMap[abbrev] || []
                });
            });
        } else {
            // No data at all, just create empty rows
            dayAbbrevs.forEach(abbrev => {
                dayRows.push({ dayName: abbrev, rowHeight: 88, events: [] });
            });
        }
    }

    // Now build a clean print-only DOM
    const container = document.createElement('div');
    container.id = 'print-timetable-temp';
    container.style.cssText = `
        position: fixed; top: -99999px; left: -99999px;
        width: 1400px; background: ${bgColor}; padding: 0;
        font-family: Arial, Helvetica, sans-serif;
    `;

    // Header row 
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
        display: flex; border-bottom: 2px solid ${borderColor}; background: ${headerBg};
    `;

    // Day column header
    const dayColHeader = document.createElement('div');
    dayColHeader.style.cssText = `
        width: 70px; flex-shrink: 0; padding: 8px 4px; text-align: center;
        font-weight: bold; font-size: 11px; color: ${headerText};
        border-right: 1px solid ${borderColor};
    `;
    dayColHeader.textContent = '';
    headerRow.appendChild(dayColHeader);

    // Period columns
    const colWidth = (1400 - 70) / totalPeriods;
    periodHeaders.forEach(period => {
        const col = document.createElement('div');
        col.style.cssText = `
            width: ${colWidth}px; flex-shrink: 0; text-align: center; padding: 6px 2px;
            border-left: 1px solid ${borderColor};
        `;
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `font-weight: bold; font-size: 12px; color: ${headerText};`;
        nameDiv.textContent = period.name;
        col.appendChild(nameDiv);

        const timeDiv = document.createElement('div');
        timeDiv.style.cssText = `font-size: 10px; color: ${isDark ? '#93c5fd' : '#4338ca'};`;
        timeDiv.textContent = period.time;
        col.appendChild(timeDiv);

        headerRow.appendChild(col);
    });
    container.appendChild(headerRow);

    // Day rows
    dayRows.forEach(dayRow => {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex; border-bottom: 1px solid ${borderColor}; position: relative;
            background: ${gridBg};
        `;

        // Day label
        const dayCell = document.createElement('div');
        dayCell.style.cssText = `
            width: 70px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 13px; color: ${dayText}; text-transform: uppercase;
            letter-spacing: 2px; border-right: 1px solid ${borderColor};
            background: ${isDark ? '#1f2937' : '#f3f4f6'};
            height: ${dayRow.rowHeight}px;
        `;
        dayCell.textContent = dayRow.dayName;
        row.appendChild(dayCell);

        // Events container
        const eventsDiv = document.createElement('div');
        eventsDiv.style.cssText = `
            flex: 1; position: relative; height: ${dayRow.rowHeight}px;
        `;

        // Grid lines
        for (let i = 0; i < totalPeriods; i++) {
            const gridLine = document.createElement('div');
            gridLine.style.cssText = `
                position: absolute; left: ${(i / totalPeriods) * 100}%;
                top: 0; bottom: 0; width: 1px; background: ${isDark ? '#374151' : '#e5e7eb'};
            `;
            eventsDiv.appendChild(gridLine);
        }

        // Event blocks
        dayRow.events.forEach(event => {
            const color = getPrintColor(event.subjectCode);
            const block = document.createElement('div');
            block.style.cssText = `
                position: absolute;
                left: ${event.left}%;
                width: ${event.width}%;
                top: ${event.top}px;
                height: ${event.height}px;
                padding: 3px;
                box-sizing: border-box;
            `;

            const inner = document.createElement('div');
            inner.style.cssText = `
                width: 100%; height: 100%; border-radius: 8px;
                background-color: ${color.bg}; color: ${color.text};
                padding: 6px 8px; box-sizing: border-box;
                display: flex; flex-direction: column; justify-content: space-between;
                overflow: hidden; border: 1px solid rgba(255,255,255,0.2);
            `;

            // Subject code
            const codeDiv = document.createElement('div');
            codeDiv.style.cssText = `font-weight: 900; font-size: 13px; line-height: 1.2; color: ${color.text};`;
            codeDiv.textContent = event.subjectCode;
            inner.appendChild(codeDiv);

            // Subject name
            if (event.subjectName && event.subjectName !== event.subjectCode) {
                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = `font-size: 9px; opacity: 0.9; line-height: 1.2; color: ${color.text}; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;`;
                nameDiv.textContent = event.subjectName;
                inner.appendChild(nameDiv);
            }

            // Section
            if (event.section) {
                const secDiv = document.createElement('div');
                secDiv.style.cssText = `font-weight: 700; font-size: 10px; color: ${color.text}; margin-top: 2px;`;
                secDiv.textContent = event.section;
                inner.appendChild(secDiv);
            }

            // Room
            if (event.room && event.room !== event.lecturer) {
                const roomDiv = document.createElement('div');
                roomDiv.style.cssText = `font-weight: 700; font-size: 10px; color: ${color.text}; margin-top: auto;`;
                roomDiv.textContent = event.room;
                inner.appendChild(roomDiv);
            }

            // Lecturer
            if (event.lecturer) {
                const lecDiv = document.createElement('div');
                lecDiv.style.cssText = `font-size: 9px; opacity: 0.85; color: ${color.text};`;
                lecDiv.textContent = event.lecturer;
                inner.appendChild(lecDiv);
            }

            block.appendChild(inner);
            eventsDiv.appendChild(block);
        });

        row.appendChild(eventsDiv);
        container.appendChild(row);
    });

    document.body.appendChild(container);
    return container;
};

/**
 * Common html2canvas options for the clean print timetable
 */
const getPrintCanvasOptions = () => ({
    scale: 2,
    useCORS: true,
    backgroundColor: document.body.classList.contains('dark') ? '#111827' : '#ffffff',
    logging: false,
    allowTaint: true,
    removeContainer: false, // We remove it ourselves
});

/**
 * Export a DOM element as PNG image
 */
export const exportToPNG = async (elementId, filename = 'timetable') => {
    const printEl = buildPrintTimetable(elementId);
    try {
        const canvas = await html2canvas(printEl, getPrintCanvasOptions());
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } finally {
        printEl.remove();
    }
};

/**
 * Export a DOM element as JPEG image
 */
export const exportToJPEG = async (elementId, filename = 'timetable') => {
    const printEl = buildPrintTimetable(elementId);
    try {
        const canvas = await html2canvas(printEl, getPrintCanvasOptions());
        const link = document.createElement('a');
        link.download = `${filename}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    } finally {
        printEl.remove();
    }
};

/**
 * Export a DOM element as PDF
 */
export const exportToPDF = async (elementId, filename = 'timetable', options = {}) => {
    const isDark = document.body.classList.contains('dark');
    const printEl = buildPrintTimetable(elementId);

    try {
        const canvas = await html2canvas(printEl, getPrintCanvasOptions());

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
            orientation: options.orientation || 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Fill PDF page background for dark mode
        if (isDark) {
            pdf.setFillColor(17, 24, 39); // #111827
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            pdf.setTextColor(255, 255, 255);
        } else {
            pdf.setTextColor(17, 24, 39);
        }

        // Calculate dimensions to fit the page with margins
        const margin = 10;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2) - (options.title ? 10 : 0);

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);

        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;

        // Center the image
        const x = (pageWidth - finalWidth) / 2;
        const y = options.title ? margin + 8 : margin;

        // Add title if provided
        if (options.title) {
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text(options.title, pageWidth / 2, margin + 5, { align: 'center' });
        }

        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

        // Add footer
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        if (isDark) {
            pdf.setTextColor(156, 163, 175);
        } else {
            pdf.setTextColor(107, 114, 128);
        }

        pdf.text(
            `Generated on ${new Date().toLocaleDateString()} - UPTM Class Registration System`,
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
        );

        pdf.save(`${filename}.pdf`);
    } finally {
        printEl.remove();
    }
};

/**
 * Export options dropdown component helper
 */
export const EXPORT_FORMATS = [
    { id: 'pdf', label: 'PDF Document', icon: '📄', extension: '.pdf' },
    { id: 'png', label: 'PNG Image', icon: '🖼️', extension: '.png' },
    { id: 'jpeg', label: 'JPEG Image', icon: '📷', extension: '.jpg' }
];

export const handleExport = async (format, elementId, filename, options = {}) => {
    switch (format) {
        case 'pdf':
            await exportToPDF(elementId, filename, options);
            break;
        case 'png':
            await exportToPNG(elementId, filename);
            break;
        case 'jpeg':
            await exportToJPEG(elementId, filename);
            break;
        default:
            throw new Error(`Unknown format: ${format}`);
    }
};
