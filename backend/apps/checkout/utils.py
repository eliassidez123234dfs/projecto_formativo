import io
from decimal import Decimal
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_order_invoice_pdf(order) -> bytes:
    """
    Genera una factura / comprobante de compra en formato PDF usando ReportLab.
    Personalizado de acuerdo con los datos ingresados del cliente y los items del pedido.
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

    # Estilos tipográficos personalizados
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E293B'),
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'InvoiceSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B')
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading3'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold',
        spaceAfter=6
    )
    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B'),
        fontName='Helvetica-Bold'
    )
    value_style = ParagraphStyle(
        'ValueStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )
    table_cell_right = ParagraphStyle(
        'TableCellRight',
        parent=table_cell_style,
        alignment=2 # Derecha
    )
    table_header_right = ParagraphStyle(
        'TableHeaderRight',
        parent=table_header_style,
        alignment=2 # Derecha
    )

    story = []

    # Encabezado Principal (Logo / Empresa e Información de Factura)
    header_data = [
        [
            Paragraph("<b>PROYECTO FORMATIVO</b><br/><font size=8 color='#64748B'>Personalización y Estampados</font>", title_style),
            Paragraph(
                f"<b>COMPROBANTE DE COMPRA</b><br/>"
                f"<font size=8 color='#64748B'><b>Orden N°:</b> #{order.id}</font><br/>"
                f"<font size=8 color='#64748B'><b>Fecha:</b> {order.created_at.strftime('%d/%m/%Y %H:%M') if order.created_at else timezone.now().strftime('%d/%m/%Y %H:%M')}</font><br/>"
                f"<font size=8 color='#64748B'><b>Estado:</b> <font color='#D97706'>Pendiente (Prueba)</font></font>",
                table_cell_right
            )
        ]
    ]

    header_table = Table(header_data, colWidths=[3.5 * inch, 4.0 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=12))

    # Bloque de información del cliente y entrega
    customer_name = order.customer_name or (order.user.usuario if order.user else 'Cliente')
    customer_email = order.customer_email or (order.user.correo if order.user else 'No registrado')

    customer_info = [
        [Paragraph("<b>Nombre / Cliente:</b>", label_style), Paragraph(customer_name, value_style)],
        [Paragraph("<b>Correo electrónico:</b>", label_style), Paragraph(customer_email, value_style)],
    ]
    if order.user:
        customer_info.append([Paragraph("<b>Usuario registrado:</b>", label_style), Paragraph(order.user.usuario, value_style)])

    # Extraer y formatear datos de entrega a partir de notes
    delivery_rows = []
    if order.notes:
        for line in order.notes.split('\n'):
            line_str = line.strip()
            if not line_str:
                continue
            if ':' in line_str:
                lbl, val = line_str.split(':', 1)
                delivery_rows.append([
                    Paragraph(f"<b>{lbl.strip()}:</b>", label_style),
                    Paragraph(val.strip(), value_style)
                ])
            else:
                delivery_rows.append([
                    Paragraph("<b>Nota:</b>", label_style),
                    Paragraph(line_str, value_style)
                ])
    else:
        delivery_rows.append([
            Paragraph("<b>Dirección:</b>", label_style),
            Paragraph("Entrega a acordar con el cliente", value_style)
        ])

    info_data = [
        [
            Paragraph("<b>DATOS DEL CLIENTE / FACTURACIÓN</b>", section_heading),
            Paragraph("<b>DIRECCIÓN Y DATOS DE ENTREGA</b>", section_heading)
        ],
        [
            Table(customer_info, colWidths=[1.3 * inch, 2.3 * inch]),
            Table(delivery_rows, colWidths=[1.1 * inch, 2.5 * inch])
        ]
    ]

    info_table = Table(info_data, colWidths=[3.7 * inch, 3.8 * inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 12))

    # Tabla de Productos / Items
    items_header = [
        Paragraph("<b>Producto</b>", table_header_style),
        Paragraph("<b>Variante (Talla/Color)</b>", table_header_style),
        Paragraph("<b>Cant.</b>", table_header_right),
        Paragraph("<b>Precio Unit.</b>", table_header_right),
        Paragraph("<b>Subtotal</b>", table_header_right),
    ]

    table_rows = [items_header]

    for item in order.items.select_related('product', 'variant').all():
        subtotal = item.quantity * item.unit_price
        table_rows.append([
            Paragraph(item.product.name, table_cell_style),
            Paragraph(f"{item.variant.size} / {item.variant.color}", table_cell_style),
            Paragraph(str(item.quantity), table_cell_right),
            Paragraph(f"${item.unit_price:,.2f} COP", table_cell_right),
            Paragraph(f"${subtotal:,.2f} COP", table_cell_right),
        ])

    # Fila de totales
    total_amount = order.total or Decimal('0.00')
    table_rows.append([
        Paragraph("<b>TOTAL A PAGAR</b>", ParagraphStyle('TotLabel', parent=table_cell_right, fontName='Helvetica-Bold')),
        "", "", "",
        Paragraph(f"<b>${total_amount:,.2f} COP</b>", ParagraphStyle('TotVal', parent=table_cell_right, fontName='Helvetica-Bold', textColor=colors.HexColor('#0F172A'), fontSize=10))
    ])

    products_table = Table(table_rows, colWidths=[2.75 * inch, 1.75 * inch, 0.6 * inch, 1.2 * inch, 1.2 * inch])
    products_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#E2E8F0')),
        ('SPAN', (0, -1), (3, -1)), # Combinar primeras 4 columnas de la fila de total
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F8FAFC')),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor('#0F172A')),
        ('TOPPADDING', (0, -1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
    ]))
    story.append(products_table)

    story.append(Spacer(1, 20))

    # Nota de aviso de prueba
    test_notice_data = [
        [
            Paragraph(
                "<b>AVISO IMPORTANTE:</b> Este documento es un comprobante de pedido de prueba (modo demostración). "
                "La orden se encuentra en estado <b>PENDIENTE</b> y está registrada en el panel del administrador. "
                "No requiere pago en línea inmediato hasta la activación de la pasarela definitiva.",
                ParagraphStyle(
                    'Notice',
                    parent=styles['Normal'],
                    fontSize=8,
                    leading=11,
                    textColor=colors.HexColor('#B45309')
                )
            )
        ]
    ]
    test_notice_table = Table(test_notice_data, colWidths=[7.5 * inch])
    test_notice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#F59E0B')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(test_notice_table)

    doc.build(story)
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value
