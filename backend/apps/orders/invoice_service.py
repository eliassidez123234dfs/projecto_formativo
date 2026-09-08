import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from django.utils import timezone


def generate_invoice_pdf(order, invoice=None):
    """
    Genera un PDF con formato de factura elegante y profesional para una orden dada.
    Retorna los bytes del PDF en memoria.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor('#DC2626')  # Rojo corporativo RED Estampación
    dark_color = colors.HexColor('#111827')
    gray_color = colors.HexColor('#4B5563')
    light_bg = colors.HexColor('#F9FAFB')
    border_color = colors.HexColor('#E5E7EB')

    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color
    )
    subtitle_style = ParagraphStyle(
        'InvoiceSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=gray_color
    )
    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=dark_color
    )
    text_bold = ParagraphStyle(
        'TextBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=dark_color
    )
    text_normal = ParagraphStyle(
        'TextNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=gray_color
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=dark_color
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=dark_color
    )

    elements = []

    # 1. Encabezado de la Factura (Logo/Marca & Datos de Factura)
    invoice_num = (
        invoice.invoice_number if invoice and invoice.invoice_number
        else f"FAC-{order.id:06d}"
    )
    order_num = order.order_number or f"ORD-{order.id:06d}"
    order_date = order.created_at.strftime("%d/%m/%Y %H:%M") if order.created_at else timezone.now().strftime("%d/%m/%Y %H:%M")

    header_left = [
        Paragraph("RED ESTAMPACIÓN", title_style),
        Paragraph("Tienda Virtual & Estampados 3D Personalizados", subtitle_style),
        Paragraph("NIT: 901.458.789-1 | Régimen Común", text_normal),
        Paragraph("Email: soporte@redestampacion.com | Tel: +57 (601) 320-0000", text_normal),
        Paragraph("Bogotá D.C., Colombia", text_normal),
    ]

    header_right = [
        Paragraph(f"FACTURA DE VENTA: <b>{invoice_num}</b>", text_bold),
        Paragraph(f"Orden Ref: <b>{order_num}</b>", text_normal),
        Paragraph(f"Fecha Emisión: {order_date}", text_normal),
        Paragraph(f"Estado de Pago: <b>{(order.get_status_display() if hasattr(order, 'get_status_display') else order.status).upper()}</b>", text_bold),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[320, 220]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceBefore=5, spaceAfter=15))

    # 2. Información del Cliente y Envío
    cust_name = order.customer_name or order.shipping_name or "Cliente General"
    cust_email = order.customer_email or order.shipping_email or "No registrado"
    cust_phone = order.shipping_phone or "No registrado"
    cust_address = order.shipping_address or "Entrega en punto de venta"
    cust_city = order.shipping_city or "Colombia"

    client_info = [
        Paragraph("FACTURAR A:", h2_style),
        Spacer(1, 4),
        Paragraph(f"<b>Nombre:</b> {cust_name}", table_cell),
        Paragraph(f"<b>Email:</b> {cust_email}", table_cell),
        Paragraph(f"<b>Teléfono:</b> {cust_phone}", table_cell),
    ]

    shipping_info = [
        Paragraph("DATOS DE ENVÍO:", h2_style),
        Spacer(1, 4),
        Paragraph(f"<b>Dirección:</b> {cust_address}", table_cell),
        Paragraph(f"<b>Ciudad / Destino:</b> {cust_city}", table_cell),
        Paragraph(f"<b>Método de Pago:</b> Wompi / Pasarela Virtual", table_cell),
    ]

    info_table = Table(
        [[client_info, shipping_info]],
        colWidths=[270, 270]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))

    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # 3. Detalle de Productos
    items_data = [
        [
            Paragraph("DESCRIPCIÓN DEL PRODUCTO", table_header),
            Paragraph("VARIANTE / TALLA", table_header),
            Paragraph("CANT.", table_header),
            Paragraph("PRECIO UNIT.", table_header),
            Paragraph("SUBTOTAL", table_header),
        ]
    ]

    subtotal_calculado = Decimal('0.00')
    items = order.items.select_related('product', 'variant').all()

    for item in items:
        prod_name = item.product.name if item.product else "Prenda Personalizada"
        variant_desc = f"{item.variant.size} / {item.variant.color}" if item.variant else "Estándar"
        unit_p = f"${item.unit_price:,.0f} COP"
        sub_p = f"${item.subtotal:,.0f} COP"
        subtotal_calculado += item.subtotal

        items_data.append([
            Paragraph(prod_name, table_cell_bold),
            Paragraph(variant_desc, table_cell),
            Paragraph(str(item.quantity), table_cell),
            Paragraph(unit_p, table_cell),
            Paragraph(sub_p, table_cell_bold),
        ])

    # En caso de que no tenga ítems vinculados pero sí total
    if not items:
        items_data.append([
            Paragraph("Orden de compra directa o personalizada", table_cell_bold),
            Paragraph("Única", table_cell),
            Paragraph("1", table_cell),
            Paragraph(f"${order.total:,.0f} COP", table_cell),
            Paragraph(f"${order.total:,.0f} COP", table_cell_bold),
        ])
        subtotal_calculado = order.total

    items_table = Table(
        items_data,
        colWidths=[190, 110, 45, 95, 100]
    )
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 1), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 7),
    ]))

    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # 4. Resumen de Totales
    total_val = order.total or subtotal_calculado
    totals_data = [
        [Paragraph("Subtotal:", text_bold), Paragraph(f"${subtotal_calculado:,.0f} COP", table_cell_bold)],
        [Paragraph("Envío:", text_bold), Paragraph("GRATIS", table_cell)],
        [Paragraph("IVA (Incluido):", text_bold), Paragraph("19%", table_cell)],
        [Paragraph("TOTAL A PAGAR:", ParagraphStyle('TotalBig', parent=text_bold, fontSize=11, textColor=primary_color)),
         Paragraph(f"${total_val:,.0f} COP", ParagraphStyle('TotalValBig', parent=text_bold, fontSize=11, textColor=primary_color))],
    ]

    totals_table = Table(totals_data, colWidths=[120, 120])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (0, -1), (-1, -1), 1, primary_color),
    ]))

    summary_container = Table(
        [[
            [
                Paragraph("<b>Términos y Condiciones:</b>", text_bold),
                Paragraph("• Garantía de 30 días en estampados y confección.", text_normal),
                Paragraph("• Para cambios conserve esta factura de venta original.", text_normal),
                Paragraph("• Gracias por apoyar el talento y la producción nacional.", text_normal),
            ],
            totals_table
        ]],
        colWidths=[300, 240]
    )
    summary_container.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    elements.append(summary_container)
    elements.append(Spacer(1, 30))

    # Pie de página
    elements.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=5, spaceAfter=8))
    elements.append(Paragraph(
        "RED Estampación — Sistema Automatizado de Facturación Electrónica y Envíos Nacionales.",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=1, textColor=gray_color)
    ))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
