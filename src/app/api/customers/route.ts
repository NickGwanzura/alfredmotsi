import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/auth';
import { prisma } from '@/app/lib/db';

// GET /api/customers - List all customers
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, siteAddress, phone, whatsapp, email } = body;

    // Validate required fields
    if (!name || !address || !phone || !email) {
      return NextResponse.json(
        { error: 'Name, address, phone, and email are required' },
        { status: 400 }
      );
    }

    // Check for existing customer with same email
    const existing = await prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A customer with this email already exists' },
        { status: 409 }
      );
    }

    // Generate portal code
    const portalCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const customer = await prisma.customer.create({
      data: {
        name,
        address,
        siteAddress: siteAddress || null,
        phone,
        whatsapp: whatsapp || null,
        email,
        portalCode,
        portalEnabled: false,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
