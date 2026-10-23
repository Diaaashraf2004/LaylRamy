window.searchSerialsBySupplier = function searchSerialsBySupplier() {
                if (!searchSupplierSerialNameInput || !supplierSerialsResultsContainer || !serialSearchMessage || !filterSerialsContainer) return;
                const supplierName = searchSupplierSerialNameInput.value.trim();
                showMessage(serialSearchMessage, ''); // Clear previous message
                supplierSerialsResultsContainer.innerHTML = ''; // Clear previous results
                filterSerialsContainer.classList.add('hidden'); // Hide filter input initially
                filterSerialsInput.value = ''; // Clear filter input
                currentSupplierSerials = []; // Clear the temporary list

                if (!supplierName) {
                    showMessage(serialSearchMessage, "يرجى إدخال اسم المورد للبحث.", true);
                    supplierSerialsResultsContainer.innerHTML = '<p class="text-center text-gray-500">أدخل اسم المورد.</p>';
                    return;
                }

                // Find supplier ID (case-insensitive)
                const supplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());

                if (!supplier) {
                    showMessage(serialSearchMessage, `لم يتم العثور على مورد بالاسم "${supplierName}".`, true);
                    supplierSerialsResultsContainer.innerHTML = `<p class="text-center text-gray-500">لم يتم العثور على مورد بالاسم "${escapeHTML(supplierName)}".</p>`;
                    return;
                }

                // Filter serial numbers log based on supplier ID
                const foundSerials = serialNumbersLog
                    .filter(log => log.supplierId === supplier.id)
                    .sort((a, b) => new Date(b.addedTimestamp) - new Date(a.addedTimestamp)); // Sort by newest first

                currentSupplierSerials = foundSerials; // Store the found serials for filtering

                if (foundSerials.length === 0) {
                    showMessage(serialSearchMessage, `لا توجد أرقام تسلسلية مسجلة للمورد "${supplierName}".`, false, true); // Info message
                    supplierSerialsResultsContainer.innerHTML = `<p class="text-center text-gray-500">لا توجد أرقام تسلسلية مسجلة لهذا المورد.</p>`;
                } else {
                     displayFilteredSupplierSerials(''); // Display all found serials initially
                     filterSerialsContainer.classList.remove('hidden'); // Show the filter input
                     showMessage(serialSearchMessage, `تم العثور على ${foundSerials.length} رقم تسلسلي للمورد "${supplierName}". يمكنك الآن تصفية النتائج أدناه.`, false);
                }
            }

function displayFilteredSupplierSerials(searchTerm = '') {
                 if (!supplierSerialsResultsContainer) return;
                 const lowerSearchTerm = searchTerm.toLowerCase();

                 const filteredList = currentSupplierSerials.filter(log =>
                     log.serial.toLowerCase().includes(lowerSearchTerm)
                 );

                 if (filteredList.length === 0) {
                      supplierSerialsResultsContainer.innerHTML = `<p class="text-center text-gray-500">لا توجد أرقام تسلسلية تطابق "${searchTerm}".</p>`;
                      return;
                 }

                 // Display results
                 let html = '<ul class="space-y-2">';
                 filteredList.forEach(log => {
                      let statusColor = 'text-gray-500'; // افتراضي
                      let statusText = log.status || 'غير محدد';
                      if (statusText === 'in_stock') { statusColor = 'text-green-600'; statusText = 'متوفر'; }
                      else if (statusText === 'sold') { statusColor = 'text-red-500'; statusText = 'مباع'; }
                      else if (statusText === 'in_invoice_temp') { statusColor = 'text-yellow-600'; statusText = 'في فاتورة'; }
                      // Add more statuses if needed

                      html += `<li class="border-b border-gray-100 pb-1">
                                   <span class="font-mono"><strong>${escapeHTML(log.serial || 'N/A')}</strong></span>
                                   <span class="text-sm text-gray-700">(${escapeHTML(log.productName || 'منتج غير محدد')})</span> -
                                   <span class="text-xs text-gray-500">${formatDateTime(log.addedTimestamp)}</span>
                                   <span class="text-xs ${statusColor} ml-2 font-medium">[${statusText}]</span>
                                 </li>`;
                 });
                 html += '</ul>';
                 supplierSerialsResultsContainer.innerHTML = html;
             }

function importSerialCSV(event, targetTextarea, messageElement) {
                const file = event.target.files[0];

                if (!file || !targetTextarea) {
                    showMessage(messageElement, "لم يتم اختيار ملف أو أن حقل السيريالات غير موجود.", true);
                    return;
                }
                if (!/\.(csv|txt)$/i.test(file.name)) {
                     showMessage(messageElement, "الرجاء اختيار ملف بصيغة CSV أو TXT.", true);
                     event.target.value = null; // Reset file input
                     return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const content = e.target.result;
                        let importedSerials = [];

                        // **** تعديل منطق القراءة لاستخلاص السيريال فقط ****
                        const lines = content.split('\n');
                        lines.forEach(line => {
                            const trimmedLine = line.trim();
                            if (trimmedLine) {
                                // افترض أن السيريال هو الجزء الأول قبل أول مسافة أو فاصلة
                                const match = trimmedLine.match(/^([^\s,]+)/);
                                if (match && match[1]) {
                                    const potentialSerial = match[1].trim();
                                    if (potentialSerial) { // تأكد أنه ليس فارغاً بعد الاقتطاع
                                        importedSerials.push(potentialSerial);
                                    }
                                }
                            }
                        });
                        // **** نهاية تعديل منطق القراءة ****


                        if (importedSerials.length > 0) {
                            // ضع السيريالات المستوردة في الـ textarea (كل واحد في سطر)
                            targetTextarea.value = importedSerials.join('\n');
                            showMessage(messageElement, `تم استيراد ${importedSerials.length} رقم تسلسلي بنجاح. يرجى المراجعة ثم الضغط على زر الحفظ/الإضافة.`, false);
                        } else {
                            showMessage(messageElement, "لم يتم العثور على أرقام تسلسلية صالحة في الملف. تأكد أن كل سيريال في سطر أو مفصول بفاصلة/مسافة.", true);
                        }

                    } catch (error) {
                        console.error("Error reading or processing serial file:", error);
                        showMessage(messageElement, `حدث خطأ أثناء قراءة الملف: ${error.message}`, true);
                    } finally {
                        event.target.value = null; // Reset file input
                    }
                };
                reader.onerror = function(e) {
                     console.error("Error reading file:", e);
                     showMessage(messageElement, "حدث خطأ أثناء قراءة الملف.", true);
                     event.target.value = null;
                };
                reader.readAsText(file);
            }
