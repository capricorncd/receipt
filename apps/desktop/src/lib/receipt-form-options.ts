export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const MIN_SEC_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/** 类别下拉框中「其他」选项的哨兵值，选中时改为显示自定义类别输入框 */
export const CATEGORY_OTHER = '__other__';
