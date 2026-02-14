"use client"

import { forwardRef } from 'react'
import { Expense } from '@/types'
import { format } from 'date-fns'
import { cn, numberToWords } from '@/lib/utils'

interface VoucherTemplateProps {
    data: Expense
    societyName?: string
}

export const VoucherTemplate = forwardRef<HTMLDivElement, VoucherTemplateProps>(({ data, societyName }, ref) => {

    // Calculations
    const taxable = data.taxable_amount || 0
    const cgst = data.cgst_amount || 0
    const sgst = data.sgst_amount || 0
    const igst = data.igst_amount || 0
    const total = data.amount || 0
    const tds = data.tds_amount || 0
    const netPayable = total - tds

    return (
        <div ref={ref} className="bg-white p-8 max-w-[210mm] mx-auto text-black print:p-0 print:max-w-none">
            <div className="border-2 border-gray-800 rounded-sm">
                {/* Header */}
                <div className="flex justify-between p-6 border-b-2 border-gray-800 bg-gray-50 print:bg-gray-100">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">{societyName || 'Housing Society'}</h1>
                        <p className="text-xs text-gray-600 uppercase tracking-widest mt-1">Payment Voucher</p>
                    </div>
                    <div className="text-right">
                        <div className="flex gap-4 text-sm">
                            <span className="font-semibold text-gray-600">Voucher #:</span>
                            <span className="font-mono font-bold">{data.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex gap-4 text-sm mt-1">
                            <span className="font-semibold text-gray-600">Date:</span>
                            <span>{format(new Date(data.date), 'dd MMM yyyy')}</span>
                        </div>
                    </div>
                </div>

                {/* Payee & Payment Info */}
                <div className="flex border-b border-gray-800">
                    <div className="w-2/3 p-4 border-r border-gray-800">
                        <div className="text-xs font-bold uppercase text-gray-500 mb-1">Paid To (Payee)</div>
                        <div className="text-lg font-bold">{data.payee || 'N/A'}</div>
                        <div className="mt-4 text-xs font-bold uppercase text-gray-500 mb-1">Expense Head</div>
                        <div className="text-md">{data.category}</div>
                    </div>
                    <div className="w-1/3 p-4">
                        <div className="text-xs font-bold uppercase text-gray-500 mb-1">Payment Method</div>
                        <div className="font-medium">{data.payment_method}</div>
                        {data.bank_particulars && (
                            <div className="mt-2 text-sm text-gray-600">
                                Ref: {data.bank_particulars}
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount Table */}
                <div className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b border-gray-800">
                            <tr>
                                <th className="py-2 px-4 text-left font-bold text-gray-700">Description</th>
                                <th className="py-2 px-4 text-right font-bold text-gray-700 w-32">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="py-4 px-4 font-medium">
                                    {data.title}
                                    {(taxable > 0 || cgst > 0) && (
                                        <div className="mt-2 text-xs text-gray-500 grid grid-cols-4 gap-4 max-w-md">
                                            <div>Taxable: ₹{taxable.toFixed(2)}</div>
                                            {cgst > 0 && <div>CGST: ₹{cgst.toFixed(2)}</div>}
                                            {sgst > 0 && <div>SGST: ₹{sgst.toFixed(2)}</div>}
                                            {igst > 0 && <div>IGST: ₹{igst.toFixed(2)}</div>}
                                        </div>
                                    )}
                                </td>
                                <td className="py-4 px-4 text-right font-mono text-lg font-bold align-top">
                                    ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            {tds > 0 && (
                                <tr className="text-red-600">
                                    <td className="py-2 px-4 text-right font-medium text-xs uppercase tracking-wider">
                                        Less: TDS ({data.tds_percentage}%)
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono font-bold">
                                        -₹{tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="border-t border-gray-800">
                            <tr>
                                <td className="py-3 px-4 italic text-gray-600 border-r border-gray-800">
                                    <span className="text-xs font-bold uppercase not-italic mr-2 text-gray-400">Net Paid (In Words):</span>
                                    {numberToWords(netPayable)}
                                </td>
                                <td className="py-3 px-4 text-right font-black bg-gray-50 text-xl">
                                    ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 p-8 pt-16 border-t-2 border-gray-800">
                    <div className="text-center">
                        <div className="border-t border-gray-400 w-3/4 mx-auto pt-2 text-xs font-bold uppercase text-gray-500">
                            Prepared By
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-gray-400 w-3/4 mx-auto pt-2 text-xs font-bold uppercase text-gray-500">
                            Approved By
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-gray-400 w-3/4 mx-auto pt-2 text-xs font-bold uppercase text-gray-500">
                            Receiver's Signature
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

VoucherTemplate.displayName = 'VoucherTemplate'
