type Props = {
  role: string;
};

export default function OrderListFilter({ role }: Props) {

    return (
         <div className="filters-bar">
          <input placeholder="환자명 / ID 검색" />
        </div>
    );
};