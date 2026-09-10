# Independent review of integrated root fixes

Eleven selected warm desktop/mobile profiles completed without driver or page errors. All66 PNGs and native/rect/scroll records were reviewed. Six source fixes are confirmed in these transitions; remaining intrinsic table-column reflow and collection-removal motion questions are retained. There was one integrated rebuild and one bounded pass, with no repeat loop.

| Scenario | Confirmed fix | Remaining issue |
|---|---|---|
| C035-edit-close | LF-04 | None in measured transition |
| C051-table | LF-09 | LF-02 |
| C069-add | LF-12 | LF-14 motion question |
| C073-new-close | LF-13 | None in measured transition |
| C012-clear | LF-03 | LF-02 |
| C030-files | LF-15 | LF-16 motion question |

## C035-edit-close

Customer renewals remains in Name during modal exit. No native shifts. Mobile first PNG47ms clearly retains text.

[Contact sheet](/Users/albin/Code/jori/dist/layout-hunt/contacts/root-by-chat/C035-edit-close.png)

## C051-table

Successful create retains long Name during drawer exit (mobile49ms). Existing column reflow remains: native0.007200185 desktop at90ms and0.010045881 mobile at56ms; mobile Last Updated moves outside viewport.

[Contact sheet](/Users/albin/Code/jori/dist/layout-hunt/contacts/root-by-chat/C051-table.png)

## C069-add

Row draft remains visible during exit (mobile41ms). Existing New row button moves down36px with inserted row (native desktop0.000130556 at61ms, mobile0.000985416 at52ms).

[Contact sheet](/Users/albin/Code/jori/dist/layout-hunt/contacts/root-by-chat/C069-add.png)

## C073-new-close

New column title, Type selector and Add column action stay in create mode throughout visible exit. Mobile PNG194ms shows retained form. Native0; remaining rects are exiting Sheet.

[Contact sheet](/Users/albin/Code/jori/dist/layout-hunt/contacts/root-by-chat/C073-new-close.png)

## C012-clear

Owner picker keeps207.5px height when Clear footer becomes invisible. Name column still249.78→132.59px and picker x1040→1023; this unfixed intrinsic-column cause is separate. Native0. Mobile Owner facet is unavailable by design.

[Contact sheet](/Users/albin/Code/jori/dist/layout-hunt/contacts/root-by-chat/C012-clear.png)

## C030-files

Mobile pager retains72px outer and56px inner height, with blank16px count slot; native0. Selected-row owner still removes confirmation before its exit, visible as gone at25ms mobile. Existing question remains.

[Contact sheet](/Users/albin/Code/jori/dist/layout-hunt/contacts/root-by-chat/C030-files.png)
