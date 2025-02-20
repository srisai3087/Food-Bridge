import HowItWorks from '../components/howItWorks';
import MainSection from '../components/mainSection';
import NavBar from '../components/nabar';
import React from "react";
import SDGSection from "../components/SDGSection";
import WhyDonate from '../components/WhyDonate';
import Chatbot from "../components/Chatbot"; // ✅ Import Chatbot
import Footer from '../components/Footer';

const HomePage = ({ User, handleLogout }) => {
  return (
    <>
      <NavBar User={User} handleLogout={handleLogout} />
      <MainSection />
      <HowItWorks />
      <SDGSection />
      <WhyDonate />
      <Footer/>
      <Chatbot /> 
     
     
      {/* <h1>Hello</h1> */}
    </>
  );
};

export default HomePage;
