import{r as $,q as ge,b as he,c as x,h as d,g as a,j as n,f as De,i as f,t as i,m as b,w as T,v as O,k as m,F as q,l as be,p as I,D as Ae}from"./vendor-vue-Dee8fQRv.js";import{u as se,r as ne}from"./vendor-firebase-B6JxyUnY.js";import{a as Ie,d as le}from"./errorHandler-zjbC6QdE.js";import{n as ye}from"./addressParser-CNmB7Rpm.js";import Pe from"./CustomerAddressModal-DYS3wMuC.js";import{S as G}from"./vendor-sweetalert-DE6NlnlT.js";const Te={class:"slm-modal"},Be={class:"slm-header no-print"},Ne={class:"slm-title"},Le={class:"slm-count-badge"},je={class:"slm-controls no-print"},Ee={class:"slm-filter-group"},Oe={class:"slm-customer-selector"},qe={class:"slm-selector-header"},Me={class:"slm-search-box"},Fe={class:"slm-quick-select-btns"},Ue={class:"slm-chips-scroll"},Ve=["onClick","title"],Re={class:"chip-checkbox"},Ye={class:"chip-name"},We={key:0,class:"chip-items"},He=["onClick","title"],Qe={key:0,class:"chip-active-lbl"},Ze=["onClick","title"],Ge=["onClick","title"],Je={key:2,class:"chip-warn-tag",title:"ยังไม่มีที่อยู่"},Ke={key:0,class:"slm-no-chips"},Xe={class:"slm-options-row"},et={class:"slm-select-wrap"},tt={class:"slm-orient-tabs"},st={class:"slm-select-wrap"},nt={style:{display:"flex",gap:"8px","flex-wrap":"wrap"}},lt={key:0,class:"slm-sender-box"},it={class:"slm-sender-grid"},at={class:"slm-select-bar"},ot={style:{display:"flex","align-items":"center",gap:"12px","flex-wrap":"wrap"}},dt={class:"slm-check-all"},rt=["checked"],ct={key:0,class:"slm-addr-counter"},ut={class:"cnt-item has"},pt={key:0,class:"cnt-item missing"},mt={style:{display:"flex",gap:"8px"}},vt=["disabled"],ft={key:0,class:"slm-empty-state no-print"},gt=["onClick"],ht={class:"banner-text"},bt={class:"highlight-label"},yt=["onClick"],kt={key:1,class:"label-main-grid"},xt={class:"ls-sender-col"},wt={class:"ls-sender-info"},_t={class:"ls-sender-name"},Ct={class:"ls-sender-addr",style:{"white-space":"pre-line"}},$t={class:"ls-sender-phone"},zt={class:"ls-bottom-left"},St=["title"],Dt=["onClick"],At={class:"ls-receiver-col"},It={class:"ls-receiver-name"},Pt={class:"ls-receiver-addr"},Tt={key:0,class:"ls-receiver-zip"},Bt={class:"zip-big"},Nt={class:"ls-receiver-phone"},Lt={key:2,class:"label-portrait-body"},jt={class:"label-sender-block"},Et={class:"sender-body"},Ot={class:"sender-name-line"},qt={class:"sender-addr-line",style:{"white-space":"pre-line"}},Mt={class:"sender-phone-line"},Ft={class:"label-receiver-block"},Ut={class:"receiver-body"},Vt={class:"receiver-name"},Rt={class:"receiver-address"},Yt={key:0,class:"receiver-zipcode"},Wt={class:"zip-num"},Ht={class:"receiver-phone"},Qt={class:"portrait-meta-bottom"},Zt=["title"],Gt=["onClick"],Jt={class:"label-thankyou-footer"},Kt={__name:"ShippingLabelModal",props:{customers:{type:Array,default:()=>[]},addressBook:{type:Object,default:()=>({})},initialSelectedId:{type:String,default:null}},emits:["close"],setup(ie){const v=ie,g=$("unprinted"),_=$("landscape"),M=$("thermal-76x130"),F=$(!1),c=$([]),C=$(""),z=$(null),ae=x(()=>z.value?v.customers.find(s=>s.id===z.value.id)||z.value:null),o=$({name:localStorage.getItem("manowzab_sender_name")||"มะนาวแซ่บ",phone:localStorage.getItem("manowzab_sender_phone")||"095-155-5706",address:localStorage.getItem("manowzab_sender_address")||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",thankYouText:localStorage.getItem("manowzab_sender_thankyou")||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"});ge(o,s=>{localStorage.setItem("manowzab_sender_name",s.name||""),localStorage.setItem("manowzab_sender_phone",s.phone||""),localStorage.setItem("manowzab_sender_address",s.address||""),localStorage.setItem("manowzab_sender_thankyou",s.thankYouText||"")},{deep:!0});function U(s){if(!s)return 1/0;const e=new Date;e.setHours(0,0,0,0);const t=new Date(s);return t.setHours(0,0,0,0),Math.ceil((t-e)/(1e3*60*60*24))}const w=x(()=>v.customers.filter(s=>v.initialSelectedId&&s.id===v.initialSelectedId||s.status!=="done")),oe=x(()=>w.value.filter(s=>!s.labelPrinted).length),J=x(()=>w.value.filter(s=>U(s.deliveryDate)===0).length),de=x(()=>w.value.filter(s=>U(s.deliveryDate)===1).length),ke=x(()=>w.value.length),k=x(()=>{let s=w.value;if(g.value==="unprinted"?s=w.value.filter(e=>!e.labelPrinted):g.value==="today"?s=w.value.filter(e=>U(e.deliveryDate)===0):g.value==="pack-tonight"&&(s=w.value.filter(e=>U(e.deliveryDate)===1)),v.initialSelectedId){const e=w.value.find(t=>t.id===v.initialSelectedId);e&&!s.some(t=>t.id===v.initialSelectedId)&&(s=[e,...s])}if(C.value.trim()){const e=C.value.trim().toLowerCase();s=s.filter(t=>{const l=(t.name||"").toLowerCase(),r=(t.recipientName||"").toLowerCase(),y=(P(t)||"").toLowerCase();return l.includes(e)||r.includes(e)||y.includes(e)})}return s}),h=x(()=>k.value.filter(s=>c.value.includes(s.id))),re=x(()=>h.value.filter(s=>!!P(s)).length),ce=x(()=>h.value.length-re.value),xe=x(()=>k.value.length>0&&c.value.length===k.value.length);ge(()=>v.initialSelectedId,s=>{s&&(g.value="all-requested",c.value=[s],C.value="")},{immediate:!0}),he(()=>{v.initialSelectedId?(g.value="all-requested",c.value=[v.initialSelectedId],C.value=""):(oe.value>0?g.value="unprinted":J.value>0?g.value="today":g.value="all-requested",c.value=k.value.map(s=>s.id))});function S(s){g.value=s,c.value=k.value.map(e=>e.id)}function we(s){s?c.value=k.value.map(e=>e.id):c.value=[]}function _e(s){const e=c.value.indexOf(s);e>-1?c.value.splice(e,1):c.value.push(s)}async function Ce(s){const e=!s.labelPrinted;try{await se(ne(le,`delivery_customers/${s.id}`),{labelPrinted:e,labelPrintedAt:e?Date.now():null}),G.fire({icon:"success",title:e?`ทำเครื่องหมาย "${s.name}" พิมพ์แล้ว`:`ยกเลิกสถานะพิมพ์แล้วของ "${s.name}"`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(t){console.error("Error updating printed status:",t)}}function ue(s){if(!s)return[];const e=ye(s.name).replace(/[.#$[\]/]/g,"_"),t=s.addresses,l=v.addressBook&&v.addressBook[e]?.addresses,r=t||l;let y=[];if(Array.isArray(r)?y=r.filter(Boolean):r&&typeof r=="object"&&(y=Object.values(r).filter(Boolean)),y.length>0)return y;if(s.address&&s.address.trim()){const u=N(s);return u&&u.address?[u]:[]}return[]}function B(s){return ue(s).length}function V(s){if(!s)return"";const e=ue(s);if(!e||e.length===0)return"";if(s.selectedAddressId){const t=e.find(l=>l.id===s.selectedAddressId);if(t)return t.label||(t.recipientName?`${t.recipientName}`:"")}if(s.address&&s.address.trim()){const t=s.address.trim(),l=e.find(r=>r.address&&r.address.trim()===t);if(l)return l.label||(l.recipientName?`${l.recipientName}`:"")}return e[0]?.label||""}function N(s){if(s.address)return{recipientName:s.recipientName||"",phone:s.phone||"",address:s.address||"",postalCode:s.postalCode||""};const e=ye(s.name).replace(/[.#$[\]/]/g,"_");return v.addressBook&&v.addressBook[e]?v.addressBook[e]:{recipientName:"",phone:"",address:"",postalCode:""}}function R(s){if(s.recipientName&&s.recipientName.trim())return s.recipientName.trim();const e=N(s);return e&&e.recipientName&&e.recipientName.trim()?e.recipientName.trim():s.name}function Y(s){return N(s).phone}function P(s){return N(s).address}function D(s){const e=N(s);if(e.postalCode)return e.postalCode;const t=(e.address||"").match(/\b[1-9]\d{4}\b(?!\/|\d)/);return t?t[0]:""}function K(s){const e=P(s)||"",t=D(s);return t?e.replace(new RegExp(`\\b${t}\\b(?![/\\d])`,"g"),"").replace(/\s+/g," ").trim():e}function X(s,e=15){const t=(s?.name||"-").trim();return t.length<=e?t:t.slice(0,e).trim()+"…"}function A(s){if(!s)return"";if(s.paymentType){const l=String(s.paymentType).trim().toLowerCase();if(l==="cod"||l==="ปลายทาง"||l==="เก็บเงินปลายทาง"||l==="เก็บปลายทาง")return"cod";if(l==="transfer"||l==="โอน"||l==="โอนเงิน")return"transfer"}const e=(s.note||"").toLowerCase(),t=(s.address||"").toLowerCase();return e.includes("cod")||e.includes("ปลายทาง")||e.includes("เก็บเงิน")||t.includes("cod")||t.includes("ปลายทาง")?"cod":""}function $e(s){return A(s)==="cod"}function L(s){const e=A(s);if(e==="cod"){const t=(s?.note||"").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);return t&&t[1]?`COD (${t[1]}฿)`:"COD"}return e==="transfer"?"โอน":"ยังไม่ระบุ"}async function ee(s){if(!s)return;const e=A(s),t=e==="cod"?"transfer":e==="transfer"?"cod":"transfer";s.paymentType=t;try{await se(ne(le,`delivery_customers/${s.id}`),{paymentType:t,updatedAt:Date.now()}),G.fire({icon:"success",title:`เปลี่ยนรูปแบบส่งของ "${s.name}" เป็น "${t==="cod"?"COD":t==="transfer"?"โอน":"ยังไม่ระบุ"}" แล้ว`,toast:!0,position:"top-end",timer:1500,showConfirmButton:!1})}catch(l){console.error("Error toggling paymentType:",l)}}function ze(){if(h.value.length===0)return;const s=document.getElementById("manowzab-label-print-frame");s&&s.remove();const e=document.createElement("iframe");e.id="manowzab-label-print-frame",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.zIndex="-9999",document.body.appendChild(e);const t=_.value==="landscape",l=t?"130mm":"76mm",r=t?"76mm":"130mm",y=o.value.name||"มะนาวแซ่บ",u=o.value.phone||"095-155-5706",W=(o.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g,"<br>"),H=o.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",te=h.value.map((p,Q)=>{const E=R(p),pe=K(p)||"⚠️ ยังไม่มีที่อยู่จัดส่ง",Z=D(p),me=Y(p)||"-";$e(p);const ve=L(p),fe=X(p);return t?`
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender + Bottom-Left System Info -->
                <div class="ls-sender">
                  <div class="sender-top-info">
                    <div class="sender-name">${y}</div>
                    <div class="sender-addr">${W}</div>
                    <div class="sender-phone">โทร. ${u}</div>
                  </div>

                  <!-- 📌 Bottom-Left Meta on Printed Label (Plain Text) -->
                  <div class="ls-meta-bottom">
                    <div class="meta-system-name">${fe}</div>
                    <div class="meta-payment-row">${ve}</div>
                  </div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name">${E}</div>
                  <div class="receiver-addr">${pe}</div>
                  ${Z?`<div class="receiver-zip">${Z}</div>`:""}
                  <div class="receiver-phone">โทร ${me}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${H}</div>
            </div>
          </div>
        `:`
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${y}</div>
                <div class="sender-addr">${W}</div>
                <div class="sender-phone">โทร. ${u}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name">${E}</div>
                <div class="receiver-addr">${pe}</div>
                ${Z?`<div class="receiver-zip">${Z}</div>`:""}
                <div class="receiver-phone">โทร ${me}</div>
              </div>

              <!-- Portrait Bottom-Left Meta (Plain Text) -->
              <div class="port-meta-bottom">
                <div class="meta-system-name">${fe}</div>
                <div class="meta-payment-row">${ve}</div>
              </div>

              <div class="card-footer">${H}</div>
            </div>
          </div>
        `}).join(""),j=e.contentWindow.document;j.open(),j.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${y}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${l} ${r} ${t?"landscape":"portrait"};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Sarabun', 'TH Sarabun New', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page {
            width: ${l};
            height: ${r};
            max-width: ${l};
            max-height: ${r};
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            display: block;
            overflow: hidden;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-card {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 0;
            padding: 4mm 6mm 1mm 6mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #000000;
            box-sizing: border-box;
            overflow: hidden;
          }
          .card-grid {
            display: flex;
            width: 100%;
            gap: 6mm;
            flex: 1;
          }
          .ls-sender {
            width: 32%;
            font-size: 8.5pt;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-top: 1mm;
            padding-bottom: 1.5mm;
          }
          .sender-top-info {
            display: flex;
            flex-direction: column;
          }
          .sender-name {
            font-size: 10.5pt;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .sender-addr {
            font-size: 8.5pt;
            font-weight: 400;
            margin-top: 2px;
            line-height: 1.4;
          }
          .sender-phone {
            font-size: 8.5pt;
            font-weight: 500;
            margin-top: 3px;
          }
          .ls-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: 9pt;
            line-height: 1.3;
          }
          .meta-system-name {
            font-size: 9pt;
            color: #000000;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 36mm;
          }
          .meta-payment-row {
            font-size: 9pt;
            color: #000000;
            font-weight: 500;
          }
          .ls-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 7.5mm;
            padding-top: 0;
            padding-left: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .port-sender {
            font-size: 8.5pt;
            line-height: 1.4;
          }
          .port-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 10mm;
            padding-top: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .port-meta-bottom {
            margin-top: auto;
            padding-top: 1.5mm;
            padding-bottom: 1.5mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
            font-size: 9pt;
            line-height: 1.3;
          }
          .port-meta-bottom .meta-system-name {
            max-width: 60mm;
          }
          .receiver-name {
            font-size: 13.5pt;
            font-weight: 600;
            line-height: 1.3;
            margin-bottom: 3px;
          }
          .receiver-addr {
            font-size: 11pt;
            line-height: 1.45;
            font-weight: 400;
          }
          .receiver-zip {
            margin-top: 3px;
            font-size: 14pt;
            font-weight: 600;
            letter-spacing: 1.5px;
          }
          .receiver-phone {
            font-size: 11pt;
            font-weight: 500;
            margin-top: 3px;
          }
          .card-footer {
            text-align: center;
            font-size: 9pt;
            font-weight: 400;
            margin-top: auto;
            padding-top: 0;
            padding-bottom: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${te}
      </body>
    </html>
  `),j.close(),setTimeout(async()=>{try{e.contentWindow&&e.contentWindow.document.fonts&&await e.contentWindow.document.fonts.ready}catch{}e.contentWindow.focus(),e.contentWindow.print();try{const p={},Q=Date.now();h.value.forEach(E=>{p[`delivery_customers/${E.id}/labelPrinted`]=!0,p[`delivery_customers/${E.id}/labelPrintedAt`]=Q}),Object.keys(p).length>0&&await se(ne(le),p)}catch(p){console.error("Error auto-updating labelPrinted status:",p)}},250)}function Se(){if(h.value.length===0){G.fire({icon:"warning",title:"ไม่มีรายการที่เลือก",text:"กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ"});return}const s=[["ลำดับ","ชื่อผู้รับ (พิมพ์บนกล่อง)","ชื่อในระบบ (CF)","รูปแบบการส่ง","เบอร์โทร","ที่อยู่","รหัสไปรษณีย์","จำนวนสินค้า","รอบส่ง","โน้ต","ผู้ส่ง","เบอร์ผู้ส่ง","ที่อยู่ผู้ส่ง"]];h.value.forEach((u,W)=>{const H=R(u)||"",te=Y(u)||"",j=P(u)||"",p=D(u)||"",Q=L(u);s.push([W+1,`"${H.replace(/"/g,'""')}"`,`"${(u.name||"").replace(/"/g,'""')}"`,`"${Q}"`,`"${te}"`,`"${j.replace(/"/g,'""')}"`,`"${p}"`,u.itemCount||0,u.deliveryDate||"",`"${(u.note||"").replace(/"/g,'""')}"`,`"${(o.value.name||"").replace(/"/g,'""')}"`,`"${(o.value.phone||"").replace(/"/g,'""')}"`,`"${(o.value.address||"").replace(/"/g,'""')}"`])});const e="\uFEFF"+s.map(u=>u.join(",")).join(`
`),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),l=URL.createObjectURL(t),r=document.createElement("a"),y=new Date().toISOString().split("T")[0];r.setAttribute("href",l),r.setAttribute("download",`รายการที่อยู่จัดส่ง_130x76_${y}.csv`),document.body.appendChild(r),r.click(),document.body.removeChild(r),G.fire({icon:"success",title:"ส่งออกไฟล์สำเร็จ!",html:`
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,confirmButtonColor:"#3b82f6"})}return he(()=>{J.value>0?S("today"):de.value>0?S("pack-tonight"):S("all-requested")}),(s,e)=>(a(),d("div",{class:"slm-overlay",onClick:e[20]||(e[20]=I(t=>s.$emit("close"),["self"]))},[n("div",Te,[n("div",Be,[n("div",Ne,[e[21]||(e[21]=n("span",null,"🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)",-1)),n("span",Le,i(h.value.length)+" รายการ",1)]),n("button",{class:"slm-close-btn",onClick:e[0]||(e[0]=t=>s.$emit("close")),title:"ปิด"},[...e[22]||(e[22]=[n("i",{class:"fa-solid fa-xmark"},null,-1)])])]),n("div",je,[n("div",Ee,[n("button",{class:b(["slm-filter-btn",{active:g.value==="unprinted"}]),onClick:e[1]||(e[1]=t=>S("unprinted"))}," ⏳ ยังไม่พิมพ์ ("+i(oe.value)+") ",3),n("button",{class:b(["slm-filter-btn",{active:g.value==="today"}]),onClick:e[2]||(e[2]=t=>S("today"))}," 🚨 ส่งวันนี้ ("+i(J.value)+") ",3),n("button",{class:b(["slm-filter-btn",{active:g.value==="pack-tonight"}]),onClick:e[3]||(e[3]=t=>S("pack-tonight"))}," 📦 แพ็คคืนนี้ ("+i(de.value)+") ",3),n("button",{class:b(["slm-filter-btn",{active:g.value==="all-requested"}]),onClick:e[4]||(e[4]=t=>S("all-requested"))}," 🌐 ทั้งหมดที่รอส่ง ("+i(ke.value)+") ",3)]),n("div",Oe,[n("div",qe,[n("div",Me,[e[23]||(e[23]=n("i",{class:"fa-solid fa-magnifying-glass slm-search-icon"},null,-1)),T(n("input",{type:"text","onUpdate:modelValue":e[5]||(e[5]=t=>C.value=t),class:"slm-search-input",placeholder:"🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."},null,512),[[O,C.value]]),C.value?(a(),d("button",{key:0,class:"slm-clear-search",onClick:e[6]||(e[6]=t=>C.value="")},"✕")):f("",!0)]),n("div",Fe,[n("button",{class:"slm-mini-btn",onClick:e[7]||(e[7]=t=>c.value=k.value.map(l=>l.id))},[...e[24]||(e[24]=[n("i",{class:"fa-solid fa-check-double"},null,-1),m(" เลือกทั้งหมด ",-1)])]),n("button",{class:"slm-mini-btn",onClick:e[8]||(e[8]=t=>c.value=[])},[...e[25]||(e[25]=[n("i",{class:"fa-solid fa-xmark"},null,-1),m(" ยกเลิกทั้งหมด ",-1)])]),n("button",{class:"slm-mini-btn highlight",onClick:e[9]||(e[9]=t=>c.value=k.value.filter(l=>!l.labelPrinted).map(l=>l.id))},[...e[26]||(e[26]=[n("i",{class:"fa-solid fa-filter"},null,-1),m(" เฉพาะที่ยังไม่พิมพ์ ",-1)])])])]),n("div",Ue,[(a(!0),d(q,null,be(k.value,t=>(a(),d("div",{key:t.id,class:b(["slm-cust-chip",{selected:c.value.includes(t.id),printed:t.labelPrinted,"no-address":!P(t)}]),onClick:l=>_e(t.id),title:`คลิกเพื่อ ${c.value.includes(t.id)?"ยกเลิก":"เลือก"} ${t.name}`},[n("span",Re,[n("i",{class:b(["fa-solid",c.value.includes(t.id)?"fa-square-check":"fa-square"])},null,2)]),n("span",Ye,i(t.name),1),t.itemCount?(a(),d("span",We,"("+i(t.itemCount)+" ชิ้น)",1)):f("",!0),B(t)>1?(a(),d("span",{key:1,class:"chip-multi-addr-tag",onClick:I(l=>z.value=t,["stop"]),title:`ลูกค้ารายนี้มี ${B(t)} ที่อยู่ (เลือก: ${V(t)||"ที่อยู่นี้"}) — คลิกเพื่อเปลี่ยนที่อยู่จัดส่ง`},[e[27]||(e[27]=n("i",{class:"fa-solid fa-layer-group"},null,-1)),n("span",null,i(B(t))+" ที่อยู่",1),V(t)?(a(),d("span",Qe,": "+i(V(t)),1)):f("",!0)],8,He)):f("",!0),n("span",{class:b(["chip-payment-tag",A(t)==="cod"?"is-cod":A(t)==="transfer"?"is-transfer":"is-unspecified"]),onClick:I(l=>ee(t),["stop"]),title:`รูปแบบจัดส่ง: ${L(t)} (คลิกเพื่อสลับระหว่าง โอน / COD)`},[A(t)==="cod"?(a(),d(q,{key:0},[m("💵 COD")],64)):A(t)==="transfer"?(a(),d(q,{key:1},[m("💳 โอน")],64)):(a(),d(q,{key:2},[m("❓ ยังไม่ระบุ")],64))],10,Ze),n("span",{class:b(["chip-status-tag",t.labelPrinted?"is-printed":"is-unprinted"]),onClick:I(l=>Ce(t),["stop"]),title:t.labelPrinted?"พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)":"ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)"},[n("i",{class:b(t.labelPrinted?"fa-solid fa-circle-check":"fa-solid fa-print")},null,2),m(" "+i(t.labelPrinted?"พิมพ์แล้ว":"ยังไม่พิมพ์"),1)],10,Ge),P(t)?f("",!0):(a(),d("span",Je," ⚠️ รอที่อยู่ "))],10,Ve))),128)),k.value.length===0?(a(),d("div",Ke," ไม่พบรายชื่อในหมวดนี้ ")):f("",!0)])]),n("div",Xe,[n("div",et,[e[28]||(e[28]=n("label",null,[n("i",{class:"fa-solid fa-rotate"}),m(" ทิศทาง:")],-1)),n("div",tt,[n("button",{class:b(["slm-orient-btn",{active:_.value==="landscape"}]),onClick:e[10]||(e[10]=t=>_.value="landscape")}," 🔄 แนวนอน (130x76mm) ",2),n("button",{class:b(["slm-orient-btn",{active:_.value==="portrait"}]),onClick:e[11]||(e[11]=t=>_.value="portrait")}," ↕️ แนวตั้ง (76x130mm) ",2)])]),n("div",st,[e[30]||(e[30]=n("label",null,[n("i",{class:"fa-solid fa-scroll"}),m(" ขนาดฉลาก:")],-1)),T(n("select",{"onUpdate:modelValue":e[12]||(e[12]=t=>M.value=t),class:"slm-select"},[...e[29]||(e[29]=[n("option",{value:"thermal-76x130"},"สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)",-1),n("option",{value:"thermal-100x150"},'สติ๊กเกอร์ 100 x 150 mm (4x6")',-1),n("option",{value:"thermal-80x100"},"สติ๊กเกอร์ 80 x 100 mm",-1),n("option",{value:"a4-grid"},"กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)",-1)])],512),[[Ae,M.value]])]),n("div",nt,[n("button",{class:"slm-export-excel-btn",onClick:Se,title:"ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์"},[...e[31]||(e[31]=[n("i",{class:"fa-solid fa-file-excel"},null,-1),m(" ส่งออก Excel เข้าแอปปริ้นเตอร์ ",-1)])]),n("button",{class:"slm-toggle-sender-btn",onClick:e[13]||(e[13]=t=>F.value=!F.value)},[e[32]||(e[32]=n("i",{class:"fa-solid fa-store"},null,-1)),m(" "+i(F.value?"ซ่อนข้อมูลร้าน":"แก้ไขข้อมูลร้านผู้ส่ง"),1)])])]),F.value?(a(),d("div",lt,[e[33]||(e[33]=n("div",{class:"slm-sender-title"},"🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)",-1)),n("div",it,[T(n("input",{type:"text","onUpdate:modelValue":e[14]||(e[14]=t=>o.value.name=t),class:"slm-input",placeholder:"ชื่อร้าน (เช่น มะนาวแซ่บ)"},null,512),[[O,o.value.name]]),T(n("input",{type:"text","onUpdate:modelValue":e[15]||(e[15]=t=>o.value.phone=t),class:"slm-input",placeholder:"เบอร์โทรผู้ส่ง"},null,512),[[O,o.value.phone]]),T(n("input",{type:"text","onUpdate:modelValue":e[16]||(e[16]=t=>o.value.address=t),class:"slm-input slm-col-span",placeholder:"ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)"},null,512),[[O,o.value.address]]),T(n("input",{type:"text","onUpdate:modelValue":e[17]||(e[17]=t=>o.value.thankYouText=t),class:"slm-input slm-col-span",placeholder:"ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)"},null,512),[[O,o.value.thankYouText]])])])):f("",!0),n("div",at,[n("div",ot,[n("label",dt,[n("input",{type:"checkbox",checked:xe.value,onChange:e[18]||(e[18]=t=>we(t.target.checked))},null,40,rt),n("span",null,"เลือก "+i(c.value.length)+" จาก "+i(k.value.length)+" คน",1)]),h.value.length>0?(a(),d("span",ct,[n("span",ut,[e[34]||(e[34]=n("i",{class:"fa-solid fa-circle-check"},null,-1)),m(" มีที่อยู่ "+i(re.value),1)]),ce.value>0?(a(),d("span",pt,[e[35]||(e[35]=n("i",{class:"fa-solid fa-circle-exclamation"},null,-1)),m(" รอที่อยู่ "+i(ce.value),1)])):f("",!0)])):f("",!0)]),n("div",mt,[n("button",{class:"btn btn-primary slm-print-btn",onClick:ze,disabled:h.value.length===0},[e[36]||(e[36]=n("i",{class:"fa-solid fa-print"},null,-1)),m(" สั่งพิมพ์ใบปะหน้า ("+i(h.value.length)+" ใบ) ",1)],8,vt)])])]),n("div",{class:b(["slm-preview-area",["paper-"+M.value,"mode-"+_.value]])},[h.value.length===0?(a(),d("div",ft,[...e[37]||(e[37]=[n("i",{class:"fa-solid fa-box-open slm-empty-icon"},null,-1),n("div",null,"ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)",-1)])])):f("",!0),(a(!0),d(q,null,be(h.value,t=>(a(),d("div",{key:t.id,class:b(["shipping-label-card",["label-"+M.value,_.value==="landscape"?"layout-landscape":"layout-portrait"]])},[B(t)>1?(a(),d("div",{key:0,class:"label-multi-addr-banner no-print",onClick:l=>z.value=t,title:"คลิกเพื่อสลับหรือเลือกที่อยู่จัดส่ง"},[n("div",ht,[e[40]||(e[40]=n("i",{class:"fa-solid fa-layer-group"},null,-1)),n("span",null,[e[38]||(e[38]=m("มี ",-1)),n("b",null,i(B(t))+" ที่อยู่",1),e[39]||(e[39]=m(" • กำลังเลือกส่งที่: ",-1)),n("b",bt,i(V(t)||"ที่อยู่นี้"),1)])]),n("button",{class:"banner-switch-btn",type:"button",onClick:I(l=>z.value=t,["stop"])},[...e[41]||(e[41]=[n("i",{class:"fa-solid fa-arrow-right-arrow-left"},null,-1),m(" สลับ/เลือกที่อยู่ ",-1)])],8,yt)],8,gt)):f("",!0),_.value==="landscape"?(a(),d("div",kt,[n("div",xt,[n("div",wt,[n("div",_t,i(o.value.name||"มะนาวแซ่บ"),1),n("div",Ct,i(o.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),n("div",$t,"โทร. "+i(o.value.phone||"095-155-5706"),1)]),n("div",zt,[n("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},i(X(t)),9,St),n("div",{class:"ls-meta-text payment-text",onClick:I(l=>ee(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},i(L(t)),9,Dt)])]),n("div",At,[n("div",It,i(R(t)),1),n("div",Pt,i(K(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),D(t)?(a(),d("div",Tt,[n("span",Bt,i(D(t)),1)])):f("",!0),n("div",Nt," โทร "+i(Y(t)||"-"),1)])])):(a(),d("div",Lt,[n("div",jt,[n("div",Et,[n("div",Ot,i(o.value.name||"มะนาวแซ่บ"),1),n("div",qt,i(o.value.address||"191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000"),1),n("div",Mt,"โทร. "+i(o.value.phone||"095-155-5706"),1)])]),n("div",Ft,[n("div",Ut,[n("div",Vt,i(R(t)),1),n("div",Rt,i(K(t)||"⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)"),1),D(t)?(a(),d("div",Yt,[n("span",Wt,i(D(t)),1)])):f("",!0),n("div",Ht," โทร "+i(Y(t)||"-"),1)])]),n("div",Qt,[n("div",{class:"ls-meta-text system-name",title:`ชื่อลูกค้าในระบบ: ${t.name}`},i(X(t)),9,Zt),n("div",{class:"ls-meta-text payment-text",onClick:I(l=>ee(t),["stop"]),title:"คลิกเพื่อสลับ โอน / COD"},i(L(t)),9,Gt)])])),n("div",Jt,i(o.value.thankYouText||"🙏 ขอบคุณที่อุดหนุนนะคะ ❤️"),1)],2))),128))],2)]),ae.value?(a(),De(Pe,{key:0,customer:ae.value,addressBook:ie.addressBook,onClose:e[19]||(e[19]=t=>z.value=null)},null,8,["customer","addressBook"])):f("",!0)]))}},is=Ie(Kt,[["__scopeId","data-v-e36886b1"]]);export{is as default};
