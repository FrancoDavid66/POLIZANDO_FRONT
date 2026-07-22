// src/components/ui/Table.jsx
//
// Tabla de datos con el mismo lenguaje visual que Card. El encabezado usa
// Nunito en mayúsculas chicas, no Baloo 2 — a ese tamaño, la redondez de
// Baloo 2 resta legibilidad. La personalidad de marca vive en los títulos
// de página (font-heading), no en cada encabezado de columna.
//
// Uso:
//   <Table>
//     <TableHead>
//       <TableRow>
//         <TableHeaderCell>Cliente</TableHeaderCell>
//         <TableHeaderCell>Patente</TableHeaderCell>
//       </TableRow>
//     </TableHead>
//     <TableBody>
//       {items.map((it) => (
//         <TableRow key={it.id}>
//           <TableCell>{it.nombre}</TableCell>
//           <TableCell>{it.patente}</TableCell>
//         </TableRow>
//       ))}
//     </TableBody>
//   </Table>

export function Table({ className = "", children, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-brand-100/10 dark:border-brand-200/10">
      <table className={`w-full text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className = "", children, ...props }) {
  return (
    <thead className={`bg-brand-primary/5 dark:bg-brand-200/5 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }) {
  return (
    <tbody
      className={`divide-y divide-brand-100/8 dark:divide-brand-200/8 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({ className = "", children, ...props }) {
  return (
    <tr
      className={`transition-colors hover:bg-brand-primary/5 dark:hover:bg-brand-200/5 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ className = "", children, ...props }) {
  return (
    <th
      className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-brand-100/60 dark:text-brand-200/60 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }) {
  return (
    <td
      className={`px-4 py-3 text-brand-100 dark:text-brand-200 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export default Table;