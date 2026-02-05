import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Common html2canvas options for better text rendering
 */
const getCanvasOptions = (element) => ({
    scale: 3,
    useCORS: true,
    backgroundColor: document.body.classList.contains('dark') ? '#1f2937' : '#ffffff',
    logging: false,
    allowTaint: true,
    removeContainer: true,
    // Clone and modify for better export
    onclone: (clonedDoc, clonedElement) => {
        // Hide all SVG icons (Lucide icons don't render well)
        const svgs = clonedElement.querySelectorAll('svg');
        svgs.forEach(svg => {
            svg.style.display = 'none';
        });

        // Hide action buttons
        const buttons = clonedElement.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.display = 'none';
        });

        // Force readable fonts and styling
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
            #${element.id} * {
                font-family: Arial, Helvetica, sans-serif !important;
                -webkit-font-smoothing: antialiased !important;
                text-rendering: optimizeLegibility !important;
            }
            #${element.id} .truncate {
                overflow: visible !important;
                text-overflow: clip !important;
                white-space: normal !important;
            }
        `;
        clonedDoc.head.appendChild(style);
    }
});

/**
 * Export a DOM element as PNG image
 */
export const exportToPNG = async (elementId, filename = 'timetable') => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, getCanvasOptions(element));

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
};

/**
 * Export a DOM element as JPEG image
 */
export const exportToJPEG = async (elementId, filename = 'timetable') => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, getCanvasOptions(element));

    const link = document.createElement('a');
    link.download = `${filename}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
};

/**
 * Export a DOM element as PDF
 */
export const exportToPDF = async (elementId, filename = 'timetable', options = {}) => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, getCanvasOptions(element));

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
        orientation: options.orientation || 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

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
    pdf.setTextColor(128, 128, 128);
    pdf.text(
        `Generated on ${new Date().toLocaleDateString()} - UPTM Class Registration System`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
    );

    pdf.save(`${filename}.pdf`);
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
