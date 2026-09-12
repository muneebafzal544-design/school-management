/**
 * Urdu (نستعلیق) translations for print pages.
 * Usage:  const T = useLabels(isUrdu);  T('studentName')
 */

const UR = {
  // General
  schoolMs:             'اسکول مینجمنٹ سسٹم',
  excellenceInEd:       'معیاری تعلیم',
  printInUrdu:          'اردو میں پرنٹ کریں',
  printInEnglish:       'انگریزی میں پرنٹ کریں',
  print:                'پرنٹ',
  back:                 'واپس',
  loading:              'لوڈ ہو رہا ہے…',

  // Student info
  billTo:               'بل بنام',
  studentName:          'طالب علم کا نام',
  fatherName:           'والد کا نام',
  rollNumber:           'رول نمبر',
  class:                'جماعت',
  section:              'سیکشن',
  academicYear:         'تعلیمی سال',
  dueDate:              'واجب الادا تاریخ',
  issueDate:            'تاریخ اجراء',

  // Fee invoice labels
  feeInvoice:           'فیس رسید',
  invoiceNo:            'رسید نمبر',
  feeBreakdown:         'فیس کی تفصیل',
  description:          'تفصیل',
  feeHead:              'فیس مد',
  amount:               'رقم (PKR)',
  subtotal:             'ذیلی کل',
  discount:             'رعایت / چھوٹ',
  lateFine:             'تاخیر جرمانہ',
  totalNetPayable:      'کل واجب الادا رقم',
  paymentHistory:       'ادائیگی کی تاریخ',
  receiptNo:            'رسید نمبر',
  date:                 'تاریخ',
  method:               'طریقہ',
  amountPaid:           'ادا شدہ رقم',
  totalPaid:            'کل ادا شدہ',
  outstandingBalance:   'باقی رقم',
  netPayable:           'کل واجب الادا',
  notes:                'نوٹس',
  waived:               'معاف',
  computerGenerated:    'یہ کمپیوٹر سے تیار کردہ رسید ہے اور دستخط کی ضرورت نہیں۔',
  contactAccounts:      'سوالات کے لیے اسکول کے اوقات میں اکاؤنٹس دفتر سے رابطہ کریں۔',
  authorisedSignature:  'مجاز دستخط',
  scanToVerify:         'تصدیق کے لیے اسکین کریں',

  // Fee challan
  feeChallan:           'فیس چالان',
  challanNo:            'چالان نمبر',
  bankCopy:             'بینک کاپی',
  studentCopy:          'طالب علم کاپی',
  accountsCopy:         'اکاؤنٹس کاپی',
  bankStamp:            'بینک مہر',
  payableAt:            'قابل ادائیگی',
  monthlyFee:           'ماہانہ فیس',
  admissionFee:         'داخلہ فیس',
  tuitionFee:           'ٹیوشن فیس',
  examFee:              'امتحان فیس',
  totalAmount:          'کل رقم',

  // Report card
  reportCard:           'رپورٹ کارڈ',
  resultCard:           'نتیجہ کارڈ / ترقی رپورٹ',
  examName:             'امتحان کا نام',
  term:                 'مدت',
  examDate:             'امتحان کی تاریخ',
  subject:              'مضمون',
  marksObtained:        'حاصل کردہ نمبر',
  totalMarks:           'کل نمبر',
  grade:                'گریڈ',
  percentage:           'فیصد',
  position:             'پوزیشن',
  attendance:           'حاضری',
  presentDays:          'حاضر دن',
  absentDays:           'غیر حاضر دن',
  result:               'نتیجہ',
  pass:                 'پاس',
  fail:                 'فیل',
  teacherRemarks:       'استاد کے تبصرے',
  principalSignature:   'پرنسپل کے دستخط',
  classTeacher:         'کلاس ٹیچر',
  totalSubjects:        'کل مضامین',
  subjectsPassed:       'پاس مضامین',
  subjectsFailed:       'فیل مضامین',

  // Month names (Urdu)
  jan: 'جنوری', feb: 'فروری', mar: 'مارچ', apr: 'اپریل',
  may: 'مئی',   jun: 'جون',   jul: 'جولائی', aug: 'اگست',
  sep: 'ستمبر', oct: 'اکتوبر', nov: 'نومبر', dec: 'دسمبر',

  // Payment methods
  cash:   'نقد',
  bank:   'بینک ٹرانسفر',
  online: 'آن لائن',
  cheque: 'چیک',
  dd:     'ڈیمانڈ ڈرافٹ',
};

/**
 * Returns a translation function for the given mode.
 * @param {boolean} isUrdu
 * @returns {(key: string, fallback?: string) => string}
 */
export function useLabels(isUrdu) {
  return (key, fallback) => {
    if (!isUrdu) return fallback ?? key;
    return UR[key] ?? fallback ?? key;
  };
}

export default UR;
