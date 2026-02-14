"use client"

import { forwardRef } from 'react'
import { MaintenanceFee, SocietyProfile, User, Unit } from '@/types'
import { format } from 'date-fns'
import { cn, numberToWords } from '@/lib/utils'

interface InvoiceTemplateProps {
    type: 'invoice' | 'receipt' | 'voucher'
    data: MaintenanceFee & {
        units?: { unit_number: string, unit_type: string, block_name?: string }
        user?: { full_name: string, email: string, phone: string }
    }
    society: Partial<SocietyProfile>
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ type, data, society }, ref) => {
    const isReceipt = type === 'receipt'
    const isVoucher = type === 'voucher'
    const title = isReceipt ? 'PAYMENT RECEIPT' : isVoucher ? 'PAYMENT VOUCHER' : 'INVOICE'
    const dateLabel = isReceipt ? 'Receipt Date' : 'Invoice Date'
    const dateValue = isReceipt ? (data.payment_date || new Date().toISOString()) : data.created_at

    // Calculations
    const amount = data.amount
    const tax = data.tax_amount || 0
    const total = data.total_amount || (amount + tax)
    const paid = data.amount_paid || 0
    const balance = total - paid

    return (
        <div ref={ref} className="bg-white p-8 max-w-[210mm] mx-auto text-black print:p-0 print:max-w-none">
            <div className="border border-gray-900 rounded-sm overflow-hidden">
                {/* Header */}
                <div className="flex justify-between p-6 border-b border-gray-900 bg-gray-50 print:bg-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">{society.name || 'Housing Society'}</h1>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap max-w-[300px] mt-2">
                            {society.address || 'Address Not Available'}
                        </p>
                        {society.is_gst_registered && (
                            <p className="text-sm font-medium mt-1">GSTIN: {society.gstin}</p>
                        )}
                        {society.registration_number && (
                            <p className="text-xs text-gray-500 mt-1">Reg No: {society.registration_number}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-gray-200 tracking-[0.2em]">{title}</h2>
                        <div className="mt-4 space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="font-semibold text-gray-600">#:</span>
                                <span className="font-mono">{data.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="font-semibold text-gray-600">{dateLabel}:</span>
                                <span>{format(new Date(dateValue), 'dd MMM yyyy')}</span>
                            </div>
                            {!isReceipt && (
                                <div className="flex justify-between gap-4">
                                    <span className="font-semibold text-gray-600">Due Date:</span>
                                    <span>{data.due_date ? format(new Date(data.due_date), 'dd MMM yyyy') : '-'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="p-6 border-b border-gray-900 flex justify-between">
                    <div className="w-1/2">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill To</h3>
                        <div className="text-sm font-medium">{data.user?.full_name || 'Resident'}</div>
                        <div className="text-sm">Unit: {data.units?.unit_number} {data.units?.block_name ? `(${data.units.block_name})` : ''}</div>
                        <div className="text-sm text-gray-600">{data.user?.phone}</div>
                    </div>
                    {isReceipt && (
                        <div className="w-1/2 text-right">
                            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Payment Details</h3>
                            <div className="text-sm"><span className="font-medium">Method:</span> {data.payment_method || 'N/A'}</div>
                            <div className="text-sm"><span className="font-medium">Txn ID:</span> {data.transaction_id || 'N/A'}</div>
                        </div>
                    )}
                </div>

                {/* Line Items */}
                <div className="p-6 min-h-[200px]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-left">
                                <th className="py-2 font-bold text-gray-600 w-16">#</th>
                                <th className="py-2 font-bold text-gray-600">Description</th>
                                <th className="py-2 font-bold text-gray-600 text-right">Taxable</th>
                                <th className="py-2 font-bold text-gray-600 text-right">CGST</th>
                                <th className="py-2 font-bold text-gray-600 text-right">SGST</th>
                                <th className="py-2 font-bold text-gray-600 text-right">IGST</th>
                                <th className="py-2 font-bold text-gray-600 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 text-gray-500">1</td>
                                <td className="py-3 font-medium">
                                    {data.description}
                                    <div className="text-xs text-gray-500 mt-0.5 capitalize">
                                        Type: {data.fee_type?.replace('_', ' ')}
                                    </div>
                                </td>
                                <td className="py-3 text-right font-mono">₹{data.taxable_amount?.toFixed(2) || amount.toFixed(2)}</td>
                                <td className="py-3 text-right font-mono">₹{data.cgst_amount?.toFixed(2) || '0.00'}</td>
                                <td className="py-3 text-right font-mono">₹{data.sgst_amount?.toFixed(2) || '0.00'}</td>
                                <td className="py-3 text-right font-mono">₹{data.igst_amount?.toFixed(2) || '0.00'}</td>
                                <td className="py-3 text-right font-mono">₹{total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex border-t border-gray-900">
                    <div className="w-1/2 p-6 border-r border-gray-900 bg-gray-50 print:bg-gray-100">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Notes</h3>
                        <p className="text-xs text-gray-600 italic">
                            {isReceipt ? 'Thank you for your payment.' : 'Please pay before the due date to avoid late fees.'}
                        </p>
                        <p className="text-xs text-gray-600 mt-4">
                            System Generated • {new Date().toLocaleString()}
                        </p>
                    </div>
                    <div className="w-1/2 p-0">
                        <div className="flex justify-between p-3 px-6 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Subtotal</span>
                            <span className="text-sm font-mono">₹{amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-3 px-6 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Tax</span>
                            <span className="text-sm font-mono">₹{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-4 px-6 bg-gray-900 text-white print:bg-black print:text-white">
                            <span className="font-bold">Total</span>
                            <span className="font-bold font-mono text-lg">₹{total.toFixed(2)}</span>
                        </div>
                        <div className="p-4 px-6 text-right border-b border-gray-200">
                            <div className="text-xs text-gray-500 uppercase">Amount in Words</div>
                            <div className="font-medium italic">{numberToWords(total)}</div>
                        </div>
                        {isReceipt ? (
                            <div className="flex justify-between p-3 px-6 border-t border-gray-200 bg-green-50 text-green-800 print:bg-gray-50 print:text-black">
                                <span className="font-bold">Amount Paid</span>
                                <span className="font-bold font-mono">₹{paid.toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between p-3 px-6 border-t border-gray-200 bg-gray-50 print:bg-white">
                                <span className="font-medium text-gray-600">Balance Due</span>
                                <span className="font-bold font-mono text-red-600 print:text-black">₹{balance.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between p-8 pt-12">
                <div className="text-center">
                    <div className="h-16"></div>
                    <div className="border-t border-gray-400 px-8 py-2 text-xs font-bold uppercase text-gray-500">
                        Receiver's Signature
                    </div>
                </div>
                <div className="text-center">
                    <div className="h-16">
                        {/* Placeholder for stamp/image */}
                    </div>
                    <div className="border-t border-gray-400 px-8 py-2 text-xs font-bold uppercase text-gray-500">
                        Authorized Signatory
                    </div>
                </div>
            </div>

            {/* Cut Line for Voucher */}
            {isVoucher && (
                <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300 text-center text-gray-400 text-xs uppercase tracking-widest">
                    Office Copy
                </div>
            )}
        </div>
    )
})

InvoiceTemplate.displayName = 'InvoiceTemplate'
