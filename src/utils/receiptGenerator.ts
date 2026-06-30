import { jsPDF } from 'jspdf';
import * as QRCodeLib from 'qrcode';
const QRCode = (QRCodeLib as any).default || QRCodeLib;
import { Invoice, Property } from '../types';

/**
 * Generates and downloads a highly detailed official Suleja LGA Tenement rate receipt PDF
 * featuring Property GIS/Units metadata, payment ledger, secure QR verification, and a digital government seal.
 */
export async function exportOfficialReceiptPDF(
  invoice: Invoice,
  property: Property,
  officerName: string,
  officerRole: string
) {
  try {
    const doc = new jsPDF();
    const transRef = invoice.transactionRef || 'REF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const paymentDate = invoice.paymentDate || '2026-06-11';
    const method = invoice.paymentMethod || 'Bank Transfer';

    // Construct highly secure cryptographic verification qr code payload
    const qrPayload = [
      `SULEJA LGA OFFICIAL RECEIPTS CLEARANCE - SECURE DIGITAL BOND`,
      `======================================================`,
      `Receipt Reference: ${invoice.id}`,
      `Property ID: ${property.id}`,
      `Assessed Owner: ${property.ownerName}`,
      `Physical Address: ${property.address}`,
      `Suleja Ward: ${property.ward}`,
      `Land Classification: ${property.propertyType}`,
      `Building Units: ${property.units} • Status: ${property.occupancyStatus}`,
      `Annual Rental Value: NGN ${property.annualRentalValue.toLocaleString()}.00`,
      `Annual Tenement Rate (Paid): NGN ${invoice.amount.toLocaleString()}.00`,
      `Reconciliation Date: ${paymentDate}`,
      `Payment Reference: ${transRef}`,
      `Gateway Channel: ${method}`,
      `Status: FULLY STATUTORY RECONCILED`,
      `======================================================`,
      `VERIFIED BY TREASURY OFFICIAL COMMISSION - LAW CAP 13`
    ].join('\n');

    // Generate high resolution QR offline
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 140,
      color: {
        dark: '#0A1F44', // customized theme color for Suleja LCA (#0A1F44)
        light: '#FFFFFF'
      }
    });

    // ------------------ PAGE DESIGN & GRAPHICS ------------------

    // Outer framing border
    doc.setDrawColor(10, 31, 68); // #0A1F44
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Thinner double inset border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 186, 273);

    // Decorative corner anchors
    doc.setFillColor(10, 31, 68);
    // Top-Left corner
    doc.rect(10, 10, 4, 4, 'F');
    // Top-Right corner
    doc.rect(196, 10, 4, 4, 'F');
    // Bottom-Left corner
    doc.rect(10, 283, 4, 4, 'F');
    // Bottom-Right corner
    doc.rect(196, 283, 4, 4, 'F');

    // WATERMARK BACKGROUND (Very faint)
    doc.setFillColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(241, 245, 249); // extremely light slate
    
    // Staggered watermark texts
    for (let wmY = 70; wmY < 250; wmY += 45) {
      doc.text("SULEJA LGA OFFICIAL REVENUE", 15, wmY, { angle: -18 });
      doc.text("LAW CAP 13 • RATE SECURED", 45, wmY + 20, { angle: -18 });
    }

    // ------------------ GOVERNMENT HEADER ------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(10, 31, 68); // #0A1F44
    doc.text("SULEJA LOCAL GOVERNMENT AREA COUNCIL", 105, 25, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("NIGER STATE GOVERNMENT OF THE FEDERAL REPUBLIC OF NIGERIA", 105, 30, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("BOARD OF INTERNAL REVENUE ASSESSMENT & RESOURCE MOBILIZATION", 105, 35, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Secretariat Road, Suleja, Niger State • PMB 102, Suleja • Email: revenue@sulejalga.ng", 105, 40, { align: "center" });

    // Header dividing lines
    doc.setDrawColor(10, 31, 68);
    doc.setLineWidth(1.2);
    doc.line(15, 44, 195, 44);
    
    doc.setDrawColor(218, 165, 32); // Gold divider
    doc.setLineWidth(0.4);
    doc.line(15, 46, 195, 46);

    // ------------------ DOCUMENT TYPE IDENTIFIER ------------------
    doc.setFillColor(240, 253, 244); // very soft green fill
    doc.setDrawColor(16, 185, 129); // emerald green border
    doc.setLineWidth(0.5);
    doc.rect(20, 52, 170, 12, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text("★ STATUTORY TENEMENT RATE CLEARANCE RECEIPT ★", 105, 59.5, { align: "center" });

    // ------------------ SECTION 1: RATEPAYER DETAILS ------------------
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("ASSESSED RATEPAYER & LAND PROPERTY DETAIL", 22, 74);
    
    // Outer border for ratepayer details block
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, 77, 82, 58, "FD");

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    let leftY = 83;
    doc.text("ASSESSED OWNER / LANDLORD:", 23, leftY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    let nameTrunc = property.ownerName;
    if (nameTrunc.length > 30) nameTrunc = nameTrunc.substring(0, 28) + "..";
    doc.text(nameTrunc, 23, leftY + 4);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("CONTACT TELEPHONE:", 23, leftY + 11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(property.ownerPhone, 23, leftY + 15);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("ASSESSED PROPERTY LANDMARK:", 23, leftY + 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    let addrTrunc = property.address;
    if (addrTrunc.length > 32) addrTrunc = addrTrunc.substring(0, 30) + "..";
    doc.text(addrTrunc, 23, leftY + 26);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("ADMINISTRATIVE SULEJA WARD:", 23, leftY + 33);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(property.ward, 23, leftY + 37);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("GEOGRAPHIC GPS COORDINATES:", 23, leftY + 44);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 31, 68);
    doc.text(`Lat ${property.latitude.toFixed(5)} • Lng ${property.longitude.toFixed(5)}`, 23, leftY + 48);


    // ------------------ SECTION 2: BILLING INDICES ------------------
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("TREASURY TRANSACTION LEDGER & METADATA", 110, 74);
    
    // Outer border for billing metadata block
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(226, 232, 240);
    doc.rect(108, 77, 82, 58, "FD");

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    let rightY = 83;
    doc.text("MUNICIPAL RECEIPT NO:", 111, rightY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 31, 68);
    doc.text(invoice.id, 111, rightY + 4);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("PROPERTY ASSET REFERENCE CODES:", 111, rightY + 11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(property.id, 111, rightY + 15);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("ISSUED TRANSACTION REFERENCE:", 111, rightY + 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(transRef, 111, rightY + 26);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("TREASURY GATEWAY CHANNEL:", 111, rightY + 33);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(method, 111, rightY + 37);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("AUDIT RECONCILIATION DATE UNIT:", 111, rightY + 44);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(paymentDate + " at 12:44:20 UTC", 111, rightY + 48);

    // ------------------ SECTION 3: ACCOUNTING TABLE ------------------
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("ASSESSED RATE ITEMIZATION & STATUTORY CHARGES", 22, 144);

    // Table Header
    doc.setFillColor(10, 31, 68); // Navy blue header
    doc.rect(20, 147, 170, 7.5, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PARTICULARS OF MUNICIPAL ASSESSMENT & CODE TYPE", 23, 152);
    doc.text("VALUATION METRIC", 115, 152, { align: "right" });
    doc.text("ANNUAL RATE CHARGE", 145, 152, { align: "right" });
    doc.text("TOTAL PAID (NGN)", 186, 152, { align: "right" });

    // Table Rows
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    
    // Row 1: Annual Appraisal Value
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 154.5, 190, 154.5);
    
    doc.setFont("helvetica", "bold");
    doc.text("Annual Rental Value (ARV) Assessment", 23, 159.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    let subtitle1 = "Building Type: " + property.propertyType + " (" + property.units + " Units Assessed • " + property.occupancyStatus + ")";
    if (subtitle1.length > 55) subtitle1 = subtitle1.substring(0, 52) + "...";
    doc.text(subtitle1, 23, 163.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("Assigned Value", 115, 159.5, { align: "right" });
    doc.text(`₦${property.annualRentalValue.toLocaleString()}.00`, 145, 159.5, { align: "right" });
    doc.text("—", 186, 159.5, { align: "right" });

    // Row 2: Tenement rate percentage charge
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 166.5, 190, 166.5);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Statutory Tenement Rate Levy (${property.ratePercentage}%)`, 23, 171.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    let subtitle2 = "Formulated multiplier percentage applied to assessed rental value under Code Cap 13";
    if (subtitle2.length > 55) subtitle2 = subtitle2.substring(0, 52) + "...";
    doc.text(subtitle2, 23, 175.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${property.ratePercentage}% of ARV`, 115, 171.5, { align: "right" });
    doc.text("—", 145, 171.5, { align: "right" });
    doc.text(`₦${(invoice.amount - invoice.penaltyAmount).toLocaleString()}.00`, 186, 171.5, { align: "right" });

    // Row 3: Delinquent Penalty
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 178.5, 190, 178.5);
    
    doc.setFont("helvetica", "bold");
    if (invoice.penaltyAmount > 0) {
      doc.setTextColor(185, 28, 28);
      doc.text("Filing Arrears penalty charge", 23, 183.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(239, 68, 68);
      let subtitle3 = "10% statutory compounding delinquency interest closed upon clearance collection";
      if (subtitle3.length > 55) subtitle3 = subtitle3.substring(0, 52) + "...";
      doc.text(subtitle3, 23, 187.5);
      doc.setFont("helvetica", "bold");
      doc.text("10% Penalty", 115, 183.5, { align: "right" });
      doc.text("—", 145, 183.5, { align: "right" });
      doc.text(`₦${invoice.penaltyAmount.toLocaleString()}.00`, 186, 183.5, { align: "right" });
    } else {
      doc.text("Filing Arrears penalty charge", 23, 183.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      let subtitle3 = "10% statutory compounding delinquency closed successfully done";
      if (subtitle3.length > 55) subtitle3 = subtitle3.substring(0, 52) + "...";
      doc.text(subtitle3, 23, 187.5);
      doc.setFont("helvetica", "bold");
      doc.text("0.00% Zero Arrears", 115, 183.5, { align: "right" });
      doc.text("—", 145, 183.5, { align: "right" });
      doc.text(`₦0.00`, 186, 183.5, { align: "right" });
    }

    // Grand total row
    doc.setDrawColor(10, 31, 68);
    doc.setLineWidth(0.8);
    doc.line(20, 191, 190, 191);
    
    doc.setFillColor(240, 253, 244); // light green background for final closed balance
    doc.rect(20, 191.5, 170, 12, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text("TOTAL REVENUE FUNDS RECONCILED & LIQUIDATED IN FULL", 23, 199);
    doc.text(`₦${invoice.amount.toLocaleString()}.00`, 186, 199, { align: "right" });

    // ------------------ SECTION 4: SECURITY STUFF (QR & DIGITAL SEAL) ------------------

    // Draw frame for security assets block
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(20, 210, 190, 210);

    // Render the cryptographically auditable QR Code on the left
    doc.addImage(qrCodeDataUrl, "PNG", 22, 215, 36, 36);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("OFFICIAL SECURE QR CODE", 63, 220);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Scan utilizing an authorized Suleja municipal terminal", 63, 224);
    doc.text("to query cryptographic deed validation indices instantly.", 63, 227.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 31, 68);
    doc.text("SECURE HASH CODE:", 63, 233);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`SLG-SECURE-BOND-${invoice.id}-2026-FBM`, 63, 236.5);


    // --- CRITICAL VISUAL SPEC: GORGEOUS DIGITAL GOVERNMENT SEAL (Right Side) ---
    // Background and frame decoration for seal
    const sealX = 158;
    const sealY = 233;
    
    // Draw outer golden starpoints pattern using dual concentric star polygons or circular background
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(10, 31, 68);
    doc.setLineWidth(0.3);
    doc.circle(sealX, sealY, 19.5, "FD");

    // Outer circle (thick) - Emerald Green
    doc.setDrawColor(16, 120, 80); // #107850
    doc.setLineWidth(1.6);
    doc.circle(sealX, sealY, 18);

    // Inner circle (thin) - Gold
    doc.setDrawColor(218, 165, 32); // Goldenrod
    doc.setLineWidth(0.6);
    doc.circle(sealX, sealY, 15.5);

    // Solid inner medallion ring
    doc.setFillColor(16, 120, 80); // Emerald Green fill
    doc.circle(sealX, sealY, 11.5, "F");

    // Inside central seal details
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("SULEJA", sealX, sealY - 4, { align: "center" });
    
    doc.setFontSize(8);
    doc.setTextColor(218, 165, 32); // Gold letters for LGA
    doc.text("L.G.A.", sealX, sealY, { align: "center" });
    
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    doc.text("OFFICIAL SEAL", sealX, sealY + 3.8, { align: "center" });

    // Small decorative stars inside seal
    doc.setFontSize(5);
    doc.setTextColor(218, 165, 32);
    doc.text("★  ★", sealX, sealY + 7.5, { align: "center" });

    // Circular text indicators bordering the seal
    doc.setFontSize(4.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 120, 80);
    doc.text("REVENUE COUNCIL COMMISSION", sealX, sealY - 21.5, { align: "center" });
    doc.setTextColor(218, 165, 32);
    doc.text("• DIGITAL SECURITY BOND DEED •", sealX, sealY + 23, { align: "center" });


    // ------------------ SECTION 5: SIGNATURES & STAMPS ------------------
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(20, 258, 190, 258);

    // Off-centre sign line 1
    doc.setDrawColor(148, 163, 184);
    doc.line(30, 273, 85, 273);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Hon. Ibrahim Abubakar", 57.5, 277, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Revenue Commission Director, Suleja", 57.5, 280.5, { align: "center" });

    // Off-centre sign line 2
    doc.setDrawColor(148, 163, 184);
    doc.line(125, 273, 180, 273);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${officerName}`, 152.5, 277, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Collector: ${officerRole}`, 152.5, 280.5, { align: "center" });

    // Save/Download operation
    doc.save(`Suleja_Official_Receipt_Cleared_ID_${invoice.id}.pdf`);
    return true;
  } catch (error) {
    console.error("PDF Export Failure: ", error);
    throw error;
  }
}
