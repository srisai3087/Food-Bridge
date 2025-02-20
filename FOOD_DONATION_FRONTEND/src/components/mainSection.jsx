import './mainSection.css';
const MainSection = () => {
  return (
    <>
      <div className="main">
        <img src="../public/main-image.jpg" className="background-image" />
        <div className="main-details">
          <h1 className="text">
            Connection food reducing waste, Feeding Hope, Sustainably
          </h1>
          <div className="buttons">
            <button className="button">Donate</button>
            <button className="button">Recieve</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainSection;
